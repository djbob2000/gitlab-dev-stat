import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware для обработки API запросов
 * Извлекает токен GitLab из cookie и добавляет его в заголовки запроса
 */
export function middleware(request: NextRequest) {
  // Получаем токен из cookie
  const token = request.cookies.get('gitlab-token');

  if (!token) {
    return NextResponse.json({ error: 'GitLab token is required' }, { status: 401 });
  }

  // Клонируем заголовки запроса и добавляем токен
  const headers = new Headers(request.headers);
  headers.set('x-gitlab-token-encrypted', token.value);

  // Возвращаем запрос с добавленным заголовком
  return NextResponse.next({
    request: {
      headers,
    },
  });
}

/**
 * Конфигурация middleware - указываем пути, для которых он должен выполняться
 * Применяем только к API маршрутам
 */
export const config = {
  matcher: ['/api/:path*'],
};
