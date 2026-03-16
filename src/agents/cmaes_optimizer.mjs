/**
 * CMA-ES 优化器 (协方差矩阵自适应进化策略)
 * 
 * 优势:
 * - 无需梯度，黑盒优化
 * - 自适应步长和协方差矩阵
 * - 全局搜索 + 局部精细
 * - 30+ 年研究历史，生产就绪
 * 
 * 优化参数:
 * - 词典权重 (43 个术语)
 * - 评估指标权重 (规则 vs LLM)
 * - 分词阈值 (最小/最大词长)
 * - 进化超参数 (变异率、交叉率)
 */

export class CMAESOptimizer {
  constructor(config = {}) {
    // 参数维度
    this.dim = config.dim || 50; // 43 个词典权重 + 7 个超参数
    
    // 种群大小
    this.lambda = config.lambda || 4 + Math.floor(3 * Math.log(this.dim));
    
    // 选择压力
    this.mu = config.mu || Math.floor(this.lambda / 2);
    
    // 学习率
    this.weights = config.weights || this._initWeights();
    this.muEff = 1 / this.weights.reduce((sum, w) => sum + w * w, 0);
    
    // 步长控制
    this.sigma = config.sigma || 0.5; // 初始步长
    this.damps = config.damps || 1 + 2 * Math.max(0, Math.sqrt((this.muEff - 1) / (this.dim + 1)) - 1) + 2 / this.muEff;
    
    // 协方差矩阵更新
    this.cc = config.cc || 4 / (this.dim + 4); // 累积常数
    this.cs = config.cs || (this.muEff + 2) / (this.dim + this.muEff + 5);
    this.c1 = config.c1 || 2 / Math.pow(this.dim + 1.3, 2); // 秩 1 更新
    this.cmu = config.cmu || Math.min(1 - this.c1, 2 * (this.muEff - 2 + 1 / this.muEff) / (Math.pow(this.dim + 2, 2) + this.muEff));
    
    // 状态变量
    this.mean = config.mean || new Array(this.dim).fill(1.0); // 初始均值
    this.pc = new Array(this.dim).fill(0); // 累积向量
    this.ps = new Array(this.dim).fill(0); // 步长累积向量
    this.B = this._identityMatrix(this.dim); // 特征向量矩阵
    this.D = new Array(this.dim).fill(1); // 特征值
    this.C = this._identityMatrix(this.dim); // 协方差矩阵
    
    // 历史记录
    this.history = [];
    this.bestScore = -Infinity;
    this.bestParams = [...this.mean];
    
    console.log(`✅ CMA-ES 优化器初始化完成`);
    console.log(`   参数维度：${this.dim}`);
    console.log(`   种群大小：${this.lambda}`);
    console.log(`   选择压力：${this.mu}`);
    console.log(`   初始步长：${this.sigma}`);
  }

  /**
   * 初始化权重
   */
  _initWeights() {
    const weights = [];
    for (let i = 0; i < this.mu; i++) {
      weights.push(Math.log(this.mu + 1) - Math.log(i + 1));
    }
    const sum = weights.reduce((s, w) => s + w, 0);
    return weights.map(w => w / sum);
  }

  /**
   * 单位矩阵
   */
  _identityMatrix(n) {
    const matrix = [];
    for (let i = 0; i < n; i++) {
      matrix[i] = new Array(n).fill(0);
      matrix[i][i] = 1;
    }
    return matrix;
  }

  /**
   * 矩阵乘法
   */
  _matVecMul(matrix, vec) {
    const result = [];
    for (let i = 0; i < matrix.length; i++) {
      let sum = 0;
      for (let j = 0; j < vec.length; j++) {
        sum += matrix[i][j] * vec[j];
      }
      result.push(sum);
    }
    return result;
  }

  /**
   * 生成高斯随机数
   */
  _gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * 生成多元高斯分布样本
   */
  _sampleMultivariateGaussian() {
    // 生成标准正态分布
    const z = [];
    for (let i = 0; i < this.dim; i++) {
      z.push(this._gaussianRandom());
    }
    
    // 应用协方差变换：x = mean + sigma * B * D * z
    const BDz = [];
    for (let i = 0; i < this.dim; i++) {
      let sum = 0;
      for (let j = 0; j < this.dim; j++) {
        sum += this.B[i][j] * this.D[j] * z[j];
      }
      BDz.push(sum);
    }
    
    const result = [];
    for (let i = 0; i < this.dim; i++) {
      result.push(this.mean[i] + this.sigma * BDz[i]);
    }
    
    return result;
  }

  /**
   * 评估函数（外部提供）
   */
  setEvaluateFunction(fn) {
    this.evaluateFn = fn;
  }

  /**
   * 单代进化
   */
  step() {
    if (!this.evaluateFn) {
      throw new Error('请先设置评估函数：setEvaluateFunction(fn)');
    }

    // 1. 生成种群
    const population = [];
    const scores = [];
    
    for (let i = 0; i < this.lambda; i++) {
      const params = this._sampleMultivariateGaussian();
      const score = this.evaluateFn(params);
      
      population.push(params);
      scores.push({ score, index: i });
      
      // 更新历史最佳
      if (score > this.bestScore) {
        this.bestScore = score;
        this.bestParams = [...params];
      }
    }
    
    // 2. 选择最优的 mu 个个体
    scores.sort((a, b) => b.score - a.score);
    const selectedIndices = scores.slice(0, this.mu).map(s => s.index);
    
    // 3. 更新均值
    const newMean = new Array(this.dim).fill(0);
    for (let i = 0; i < this.mu; i++) {
      const idx = selectedIndices[i];
      for (let j = 0; j < this.dim; j++) {
        newMean[j] += this.weights[i] * population[idx][j];
      }
    }
    
    // 4. 计算进化路径
    const meanDiff = [];
    for (let i = 0; i < this.dim; i++) {
      meanDiff.push((newMean[i] - this.mean[i]) / this.sigma);
    }
    
    // 更新累积向量 pc
    for (let i = 0; i < this.dim; i++) {
      this.pc[i] = (1 - this.cc) * this.pc[i] + Math.sqrt(this.cc * (2 - this.cc)) * meanDiff[i];
    }
    
    // 更新步长累积向量 ps
    const BDinv_pc = this._matVecMul(this.B, this.pc.map((v, i) => v / this.D[i]));
    for (let i = 0; i < this.dim; i++) {
      this.ps[i] = (1 - this.cs) * this.ps[i] + Math.sqrt(this.cs * (2 - this.cs)) * BDinv_pc[i];
    }
    
    // 5. 更新步长 sigma
    const psNorm = Math.sqrt(this.ps.reduce((sum, v) => sum + v * v, 0));
    const chiN = Math.sqrt(this.dim) * (1 - 1 / (4 * this.dim) + 1 / (21 * this.dim * this.dim));
    this.sigma *= Math.exp(this.cs / this.damps * (psNorm / chiN - 1));
    
    // 6. 更新协方差矩阵
    const pcOuter = [];
    for (let i = 0; i < this.dim; i++) {
      pcOuter[i] = [];
      for (let j = 0; j < this.dim; j++) {
        pcOuter[i][j] = this.pc[i] * this.pc[j];
      }
    }
    
    // 秩 1 更新
    for (let i = 0; i < this.dim; i++) {
      for (let j = 0; j < this.dim; j++) {
        this.C[i][j] = (1 - this.c1 - this.cmu) * this.C[i][j] + 
                       this.c1 * pcOuter[i][j];
      }
    }
    
    // 秩 mu 更新
    for (let k = 0; k < this.mu; k++) {
      const idx = selectedIndices[k];
      const diff = [];
      for (let i = 0; i < this.dim; i++) {
        diff.push((population[idx][i] - this.mean[i]) / this.sigma);
      }
      
      for (let i = 0; i < this.dim; i++) {
        for (let j = 0; j < this.dim; j++) {
          this.C[i][j] += this.cmu * this.weights[k] * diff[i] * diff[j];
        }
      }
    }
    
    // 7. 特征分解（简化版，实际应使用完整特征分解）
    this._eigenDecomposition();
    
    // 8. 更新均值
    this.mean = newMean;
    
    // 9. 记录历史
    this.history.push({
      generation: this.history.length,
      bestScore: this.bestScore,
      meanScore: scores.reduce((sum, s) => sum + s.score, 0) / this.lambda,
      sigma: this.sigma,
    });
    
    return {
      generation: this.history.length,
      bestScore: this.bestScore,
      meanScore: this.history[this.history.length - 1].meanScore,
      sigma: this.sigma,
      bestParams: [...this.bestParams],
    };
  }

  /**
   * 特征分解（简化版）
   */
  _eigenDecomposition() {
    // 简化：只更新对角线元素
    for (let i = 0; i < this.dim; i++) {
      this.D[i] = Math.sqrt(Math.max(0, this.C[i][i]));
      this.B[i][i] = 1;
    }
  }

  /**
   * 运行多代进化
   */
  async run(generations, onGeneration) {
    console.log(`\n🚀 开始 CMA-ES 进化：${generations} 代`);
    
    for (let gen = 0; gen < generations; gen++) {
      const result = this.step();
      
      if (onGeneration && gen % 10 === 0) {
        onGeneration(result);
      }
    }
    
    return {
      bestScore: this.bestScore,
      bestParams: this.bestParams,
      history: this.history,
    };
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      mean: [...this.mean],
      sigma: this.sigma,
      bestScore: this.bestScore,
      bestParams: [...this.bestParams],
      history: [...this.history],
    };
  }

  /**
   * 恢复状态
   */
  restoreState(state) {
    this.mean = [...state.mean];
    this.sigma = state.sigma;
    this.bestScore = state.bestScore;
    this.bestParams = [...state.bestParams];
    this.history = [...state.history];
  }
}
