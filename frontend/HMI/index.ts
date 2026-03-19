/**
 * HMI 组件索引
 * 监控UI独立于app，解耦存放
 */
export { ZLadderHMI } from "./Z字梯";
export { BeanStationHMI } from "./生豆处理站";
export { WarehouseHMI } from "./智能仓储";
export { CatalyticConverterHMI } from "./三元催化";
export type { HMIComponentProps } from "./types";

import { ZLadderHMI } from "./Z字梯";
import { BeanStationHMI } from "./生豆处理站";
import { WarehouseHMI } from "./智能仓储";
import { CatalyticConverterHMI } from "./三元催化";
import type { HMIComponentProps } from "./types";

export const hmiComponents: Record<string, React.ComponentType<HMIComponentProps>> = {
  // 按配置ID映射
  "config-zladder": ZLadderHMI,
  "config-bean": BeanStationHMI,
  "config-warehouse": WarehouseHMI,
  "config-catalytic": CatalyticConverterHMI,
  
  // 按设备类型映射
  "输送设备": ZLadderHMI,
  "处理设备": BeanStationHMI,
  "仓储设备": WarehouseHMI,
  "催化设备": CatalyticConverterHMI,
};

/**
 * 获取设备对应的HMI组件
 */
export function getHMIComponent(configId?: string, deviceType?: string) {
  if (configId && hmiComponents[configId]) {
    return hmiComponents[configId];
  }
  if (deviceType && hmiComponents[deviceType]) {
    return hmiComponents[deviceType];
  }
  return null;
}
