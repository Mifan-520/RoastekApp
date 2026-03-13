export function createSeedUsers(config) {
  return [
    {
      id: "user-admin",
      username: config.adminUsername,
      password: config.adminPassword,
      displayName: "Admin User",
      role: "admin",
      roleLabel: "管理员",
    },
    {
      id: "user-normal",
      username: config.userUsername,
      password: config.userPassword,
      displayName: "Normal User",
      role: "user",
      roleLabel: "用户",
    },
  ];
}
