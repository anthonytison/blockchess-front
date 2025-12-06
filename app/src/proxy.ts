import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ['/rewards', '/profile', '/game'];

export function proxy(request: NextRequest) {
    const isProtectedRoute = protectedRoutes.includes(request.nextUrl.pathname);
    
    if (isProtectedRoute) {
        // In Next.js 16, use request.cookies in proxy instead of cookies() from next/headers
        const cookieName = process.env.NEXT_PUBLIC_COOKIE_NAME;
        if (!cookieName || !request.cookies.has(cookieName)) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    // matcher: '/:lng*'
    matcher: ['/((?!api|_next/static|_next/image|assets|medias|robots.txt|sitemap.xml|favicon.ico|sw.js).*)']
  }

