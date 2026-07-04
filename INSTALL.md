# 🔧 依赖安装说明

## 快速安装

```bash
# 在项目根目录执行
npm install

# 安装数据库包
cd packages/database && npm install && cd ../..

# 安装后端
cd apps/backend && npm install && cd ../..

# 安装前端（如果还没安装）
cd apps/frontend && npm install && cd ../..
```

## 重要说明

由于 Prisma 的安装机制，我们简化了依赖结构：

- ❌ 不使用 workspace 的 `@cargoflow/database` 包
- ✅ 直接在后端引入 `@prisma/client`

这样可以避免依赖冲突，且不影响功能。

## 如果遇到安装错误

```bash
# 清理所有 node_modules
rm -rf node_modules package-lock.json
rm -rf apps/*/node_modules apps/*/package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json

# 重新安装
npm install
cd packages/database && npm install && cd ../..
cd apps/backend && npm install && cd ../..
cd apps/frontend && npm install && cd ../..
```

## 验证安装成功

```bash
# 检查各目录的 node_modules
ls node_modules              # 根目录
ls packages/database/node_modules
ls apps/backend/node_modules
ls apps/frontend/node_modules

# 验证 Prisma
cd packages/database && npx prisma --version
```

安装成功后，继续查看 `QUICKSTART.md` 进行下一步操作。
