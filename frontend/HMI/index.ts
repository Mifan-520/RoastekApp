/**
 * HMI 组件索引
 * 组态UI独立于app，解耦存放
 */
export { ZLadderHMI } from "./Z字梯";
export { BeanStationHMI } from "./生豆处理站";
export { WarehouseHMI } from "./智能仓储";

import { ZLadderHMI } from "./Z字梯";
import { BeanStationHMI } from "./生豆处理站";
import { WarehouseHMI } from "./智能仓储";

export const hmiComponents: Record<string, React.ComponentType<any>> = {
  // 按配置ID映射
  "config-zladder": ZLadderHMI,
  "config-bean": BeanStationHMI,
  "config-warehouse": WarehouseHMI,
  
  // 按设备类型映射
  "输送设备": ZLadderHMI,
  "处理设备": BeanStationHMI,
  "仓储设备": WarehouseHMI,
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