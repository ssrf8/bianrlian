# Face Verification Trading-Style Web App

移动端交易平台风格的人脸认证系统，包含前台登录/人脸认证流程、录像上传、后台管理和 Docker Compose 部署。

## Run

```powershell
docker compose up -d --build
```

- Frontend: http://localhost:8008
- Admin panel: http://localhost:8008/admin
- Default admin: `admin` / `change-this-password`

生产部署前请修改 `docker-compose.yml` 中的 `ADMIN_PASSWORD`、`ADMIN_TOKEN_SECRET` 和数据库密码。浏览器摄像头在生产环境通常需要 HTTPS。

## Notes

- 用户密码只用于前端流程输入，不上传到后端。
- 后端保存账号、人脸认证录像、动作完成结果和客户端元数据。
- Logo 区域保留为空位，不使用第三方品牌标识。
