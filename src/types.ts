// 输出格式类型
export type OutputFormat = 'txt' | 'srt' | 'vtt' | 'md';

// 处理任务
export interface ExtractTask {
  url: string;
  outputFormat: OutputFormat;
  outputDir: string;
  keepTempFiles?: boolean;
  cookies?: string;
  modelName?: string;
}

// 转录片段
export interface Segment {
  start: number;
  end: number;
  text: string;
}

// 转录结果
export interface TranscribeResult {
  text: string;
  segments: Segment[];
  metadata: {
    duration: number;
    language: string;
  };
}

// 提取结果
export interface ExtractResult {
  success: boolean;
  result?: TranscribeResult;
  outputPath?: string;
  error?: string;
}

// 批量任务状态
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 批量任务
export interface BatchTask {
  id: string;
  status: TaskStatus;
  total: number;
  completed: number;
  results: ExtractResult[];
}

// 依赖检测结果
export interface DependencyCheckResult {
  name: string;
  installed: boolean;
  version?: string;
  error?: string;
}
