export type ReportTimeRange = "day" | "month" | "year";

export interface ReportStageDatum {
  stage: string;
  value: number;
}

export const PRODUCTION_DATA: Record<ReportTimeRange, ReportStageDatum[]> = {
  day: [
    { stage: "生豆", value: 1000 },
    { stage: "烘焙", value: 800 },
    { stage: "包装", value: 500 },
  ],
  month: [
    { stage: "生豆", value: 1000 },
    { stage: "烘焙", value: 800 },
    { stage: "包装", value: 500 },
  ],
  year: [
    { stage: "生豆", value: 1000 },
    { stage: "烘焙", value: 800 },
    { stage: "包装", value: 500 },
  ],
};
