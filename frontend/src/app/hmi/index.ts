/**
 * HMI 组件索引
 * 根据设备类型/配置ID返回对应的HMI组件
 */
export { ZLadderHMI } from "./zladder";
export { BeanStationHMI } from "./bean-station";
export { WarehouseHMI } from "./warehouse";

import { ZLadderHMI } from "./zladder";
import { BeanStationHMI } from "./bean-station";
import { WarehouseHMI } from "./warehouse";

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
 * @param configId 设备配置ID
 * @param deviceType 设备类型
 * @returns HMI组件或null
 */
export function getHMIComponent(configId?: string, deviceType?: string) {
  // 优先按配置ID匹配
  if (configId && hmiComponents[configId]) {
    return hmiComponents[configId];
  }
  // 其次按设备类型匹配
  if (deviceType && hmiComponents[deviceType]) {
    return hmiComponents[deviceType];
  }
  return null;
}