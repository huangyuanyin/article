import { HttpError } from './http-error.js';
function getBearerToken(request) {
    const header = request.header('authorization');
    if (!header?.startsWith('Bearer ')) {
        throw new HttpError(401, 'UNAUTHENTICATED', '请先登录管理员账号');
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token)
        throw new HttpError(401, 'UNAUTHENTICATED', '请先登录管理员账号');
    return token;
}
export function createAdminAuthenticator(client, adminEmails) {
    return async (request) => {
        const token = getBearerToken(request);
        const { data, error } = await client.auth.getUser(token);
        const email = data.user?.email?.trim().toLowerCase();
        if (error || !email) {
            throw new HttpError(401, 'UNAUTHENTICATED', '登录已失效，请重新登录');
        }
        if (!adminEmails.has(email)) {
            throw new HttpError(403, 'FORBIDDEN', '当前账号没有后台管理权限');
        }
    };
}
