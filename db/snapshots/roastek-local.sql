--
-- PostgreSQL database dump
--

\restrict 6uHVAK13Uh3WTHs7fKIwjt6IQAgvRMKEY72vdyymDWs0bss3JHNXkylxY6mRNFz

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.app_state DROP CONSTRAINT IF EXISTS app_state_pkey;
DROP TABLE IF EXISTS public.app_state;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_state; Type: TABLE; Schema: public; Owner: roastek
--

CREATE TABLE public.app_state (
    state_key text NOT NULL,
    payload jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.app_state OWNER TO roastek;

--
-- Data for Name: app_state; Type: TABLE DATA; Schema: public; Owner: roastek
--

COPY public.app_state (state_key, payload, updated_at) FROM stdin;
groups	[{"id": "group-fd4f64c0-df1e-42a4-a21e-68f3564e4cd4", "name": "福州三喜燕", "userId": "user-admin", "deviceIds": ["dev-bean-001", "dev-warehouse-001"]}]	2026-03-17 08:43:25.044297+00
users	[{"id": "user-admin", "role": "admin", "password": "admin", "username": "admin", "roleLabel": "管理员", "displayName": "Admin"}, {"id": "user-normal", "role": "user", "password": "user", "username": "user", "roleLabel": "用户", "displayName": "Normal User"}]	2026-03-17 08:43:33.70771+00
devices	[{"id": "dev-zladder-001", "name": "Z字梯", "type": "输送设备", "alarms": [], "config": {"id": "config-zladder", "name": "Z字梯监控", "payload": {"chart": {"data": [{"color": "#16a34a", "label": "驱动电机", "value": 52}, {"color": "#facc15", "label": "控制系统", "value": 18}, {"color": "#f97316", "label": "照明", "value": 12}, {"color": "#a78bfa", "label": "辅助设备", "value": 18}], "title": "Z字梯能耗分布"}, "summary": [{"id": "speed", "tone": "rose", "unit": "m/s", "label": "运行速度", "value": "2.4"}, {"id": "load", "tone": "amber", "unit": "%", "label": "当前负载", "value": "85"}, {"id": "efficiency", "tone": "rose", "unit": "%", "label": "传输效率", "value": "98"}], "controls": [{"id": "motor-z", "icon": "power", "tone": "rose", "label": "主驱动电机", "active": true, "description": "运行中"}, {"id": "speed-z", "icon": "gauge", "tone": "amber", "label": "速度控制", "active": true, "description": "2.4 m/s"}, {"id": "fan-z", "icon": "fan", "tone": "rose", "label": "散热风机", "active": true, "description": "运行中"}]}}, "status": "offline", "address": "福州三喜燕", "boundAt": "2026-03-15T08:30:00+08:00", "ownerId": "user-admin", "location": "福州三喜燕", "claimCode": "ZLADDER0", "createdAt": "2026-03-15T08:00:00+08:00", "updatedAt": "2026-03-18T12:11:38+08:00", "lastActive": "2026-03-17T08:30:00+08:00", "lastSeenAt": "2026-03-17T08:30:00+08:00", "defaultName": "Z字梯", "defaultType": "输送设备", "defaultAddress": "福州三喜燕", "defaultLocation": "福州三喜燕", "connectionHistory": [{"id": "conn-1", "time": "2026-03-17T08:30:00+08:00", "type": "offline", "label": "设备离线"}], "defaultConfigName": "Z字梯监控"}, {"id": "dev-bean-001", "name": "生豆处理站", "type": "处理设备", "alarms": [{"id": "alarm-bean-001", "time": "2026-03-17T08:45:00+08:00", "level": "warning", "message": "分选机振动异常，请检查轴承状态"}, {"id": "alarm-bean-002", "time": "2026-03-17T07:30:00+08:00", "level": "info", "message": "除尘系统滤芯需更换"}], "config": {"id": "config-bean", "name": "生豆处理站监控", "payload": {"chart": {"data": [{"color": "#be123c", "label": "分选机", "value": 35}, {"color": "#f97316", "label": "输送带", "value": 25}, {"color": "#facc15", "label": "除尘系统", "value": 22}, {"color": "#16a34a", "label": "其他", "value": 18}], "title": "生豆处理站能耗分布"}, "summary": [{"id": "temp", "tone": "rose", "unit": "C", "label": "处理温度", "value": "28"}, {"id": "humidity", "tone": "amber", "unit": "%", "label": "环境湿度", "value": "65"}, {"id": "throughput", "tone": "rose", "unit": "kg/h", "label": "处理量", "value": "450"}], "controls": [{"id": "sorter-b", "icon": "power", "tone": "rose", "label": "分选机", "active": true, "description": "运行中"}, {"id": "conveyor-b", "icon": "gauge", "tone": "amber", "label": "输送带", "active": true, "description": "运行中"}, {"id": "dust-b", "icon": "fan", "tone": "rose", "label": "除尘系统", "active": true, "description": "运行中"}]}}, "status": "online", "address": "福州三喜燕", "boundAt": "2026-03-15T08:45:00+08:00", "ownerId": "user-admin", "location": "福州三喜燕", "claimCode": "BEAN0001", "createdAt": "2026-03-15T08:20:00+08:00", "updatedAt": "2026-03-17T09:08:00+08:00", "lastActive": "2026-03-17T09:08:00+08:00", "lastSeenAt": "2026-03-17T09:08:00+08:00", "defaultName": "生豆处理站", "defaultType": "处理设备", "defaultAddress": "福州三喜燕", "defaultLocation": "福州三喜燕", "connectionHistory": [{"id": "conn-3", "time": "2026-03-17T09:08:00+08:00", "type": "online", "label": "设备上线"}], "defaultConfigName": "生豆处理站监控"}, {"id": "dev-warehouse-001", "name": "智能仓储", "type": "仓储设备", "alarms": [{"id": "alarm-warehouse-001", "time": "2026-03-17T08:20:00+08:00", "level": "warning", "message": "温控系统压缩机高温预警"}, {"id": "alarm-warehouse-002", "time": "2026-03-17T06:00:00+08:00", "level": "info", "message": "库存容量已超过75%，建议调整入库计划"}, {"id": "alarm-warehouse-003", "time": "2026-03-16T14:30:00+08:00", "level": "error", "message": "堆垛机定位偏差超过阈值"}], "config": {"id": "config-warehouse", "name": "智能仓储监控", "payload": {"chart": {"data": [{"color": "#7c3aed", "label": "温控系统", "value": 42}, {"color": "#8b5cf6", "label": "堆垛机", "value": 28}, {"color": "#a78bfa", "label": "照明", "value": 15}, {"color": "#ddd6fe", "label": "监控", "value": 15}], "title": "智能仓储能耗分布"}, "summary": [{"id": "capacity", "tone": "amber", "unit": "%", "label": "库存容量", "value": "78"}, {"id": "items", "tone": "rose", "unit": "批", "label": "存储批次", "value": "156"}, {"id": "temperature", "tone": "rose", "unit": "C", "label": "仓内温度", "value": "22"}], "controls": [{"id": "ac-w", "icon": "power", "tone": "rose", "label": "温控系统", "active": true, "description": "制冷中"}, {"id": "stacker-w", "icon": "gauge", "tone": "amber", "label": "堆垛机", "active": false, "description": "待机"}, {"id": "monitor-w", "icon": "fan", "tone": "rose", "label": "监控系统", "active": true, "description": "运行中"}]}}, "status": "online", "address": "福州三喜燕", "boundAt": "2026-03-15T09:00:00+08:00", "ownerId": "user-admin", "location": "福州三喜燕", "claimCode": "WAREH001", "createdAt": "2026-03-15T08:40:00+08:00", "updatedAt": "2026-03-17T09:05:00+08:00", "lastActive": "2026-03-17T09:05:00+08:00", "lastSeenAt": "2026-03-17T09:05:00+08:00", "defaultName": "智能仓储", "defaultType": "仓储设备", "defaultAddress": "福州三喜燕", "defaultLocation": "福州三喜燕", "connectionHistory": [{"id": "conn-4", "time": "2026-03-17T09:05:00+08:00", "type": "online", "label": "设备上线"}, {"id": "conn-5", "time": "2026-03-16T22:00:00+08:00", "type": "offline", "label": "计划性停机"}], "defaultConfigName": "智能仓储监控"}, {"id": "dev-new-001", "name": "三元催化", "type": "", "alarms": [], "config": {"id": "config-catalytic", "name": "三元催化监控", "payload": {"modes": [{"fireMinutes": 5, "closeMinutes": 3}, {"fireMinutes": 9, "closeMinutes": 3}, {"fireMinutes": 5, "closeMinutes": 3}, {"fireMinutes": 5, "closeMinutes": 3}], "temperature": 0}}, "status": "offline", "address": "上海洛钛", "boundAt": "2026-03-18T12:38:26+08:00", "ownerId": "user-admin", "location": "", "claimCode": "5ABH3YT2", "createdAt": "2026-03-18T04:30:41.107Z", "updatedAt": "2026-03-18T13:59:39+08:00", "lastActive": null, "lastSeenAt": null, "defaultName": "新设备", "defaultType": "待定", "defaultAddress": "", "defaultLocation": "", "connectionHistory": [], "defaultConfigName": "默认监控"}, {"id": "dev-new-002", "name": "", "type": "", "alarms": [], "config": null, "status": "offline", "address": "", "boundAt": null, "ownerId": null, "location": "", "claimCode": "RHQLE9U1", "createdAt": "2026-03-18T04:30:41.108Z", "updatedAt": "2026-03-18T04:30:41.108Z", "lastActive": null, "lastSeenAt": null, "defaultName": "新设备", "defaultType": "待定", "defaultAddress": "", "defaultLocation": "", "connectionHistory": [], "defaultConfigName": "默认监控"}, {"id": "dev-new-003", "name": "", "type": "", "alarms": [], "config": null, "status": "offline", "address": "", "boundAt": null, "ownerId": null, "location": "", "claimCode": "8LB0AUVI", "createdAt": "2026-03-18T04:30:41.108Z", "updatedAt": "2026-03-18T04:30:41.108Z", "lastActive": null, "lastSeenAt": null, "defaultName": "新设备", "defaultType": "待定", "defaultAddress": "", "defaultLocation": "", "connectionHistory": [], "defaultConfigName": "默认监控"}, {"id": "dev-new-004", "name": "", "type": "", "alarms": [], "config": null, "status": "offline", "address": "", "boundAt": null, "ownerId": null, "location": "", "claimCode": "NHBEPHDE", "createdAt": "2026-03-18T04:30:41.108Z", "updatedAt": "2026-03-18T04:30:41.108Z", "lastActive": null, "lastSeenAt": null, "defaultName": "新设备", "defaultType": "待定", "defaultAddress": "", "defaultLocation": "", "connectionHistory": [], "defaultConfigName": "默认监控"}, {"id": "dev-new-005", "name": "", "type": "", "alarms": [], "config": null, "status": "offline", "address": "", "boundAt": null, "ownerId": null, "location": "", "claimCode": "PC92P4X6", "createdAt": "2026-03-18T04:30:41.108Z", "updatedAt": "2026-03-18T04:30:41.108Z", "lastActive": null, "lastSeenAt": null, "defaultName": "新设备", "defaultType": "待定", "defaultAddress": "", "defaultLocation": "", "connectionHistory": [], "defaultConfigName": "默认监控"}, {"id": "dev-new-006", "name": "", "type": "", "alarms": [], "config": null, "status": "offline", "address": "", "boundAt": null, "ownerId": null, "location": "", "claimCode": "7RDN32SP", "createdAt": "2026-03-18T04:30:41.108Z", "updatedAt": "2026-03-18T04:30:41.108Z", "lastActive": null, "lastSeenAt": null, "defaultName": "新设备", "defaultType": "待定", "defaultAddress": "", "defaultLocation": "", "connectionHistory": [], "defaultConfigName": "默认监控"}, {"id": "dev-new-007", "name": "", "type": "", "alarms": [], "config": null, "status": "offline", "address": "", "boundAt": null, "ownerId": null, "location": "", "claimCode": "NWK8EG63", "createdAt": "2026-03-18T04:30:41.108Z", "updatedAt": "2026-03-18T04:30:41.108Z", "lastActive": null, "lastSeenAt": null, "defaultName": "新设备", "defaultType": "待定", "defaultAddress": "", "defaultLocation": "", "connectionHistory": [], "defaultConfigName": "默认监控"}]	2026-03-18 05:59:39.543466+00
\.


--
-- Name: app_state app_state_pkey; Type: CONSTRAINT; Schema: public; Owner: roastek
--

ALTER TABLE ONLY public.app_state
    ADD CONSTRAINT app_state_pkey PRIMARY KEY (state_key);


--
-- PostgreSQL database dump complete
--

\unrestrict 6uHVAK13Uh3WTHs7fKIwjt6IQAgvRMKEY72vdyymDWs0bss3JHNXkylxY6mRNFz

