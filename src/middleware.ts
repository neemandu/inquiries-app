import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Check domain and redirect if needed BEFORE any other processing
  const hostname = req.headers.get("host") || "";

  // If the current domain is inquiries-app.vercel.app, redirect to cpateam.vercel.app
  if (hostname === "inquiries-app.vercel.app") {
    const redirectUrl = new URL(req.url);
    redirectUrl.hostname = "cpateam.vercel.app";
    redirectUrl.host = "cpateam.vercel.app";

    return NextResponse.redirect(redirectUrl.toString());
  }

  // Protect all routes except public ones
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
