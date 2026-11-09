import { NextResponse } from 'next/server';
import { isValidPhone, toE164 } from '@/lib/phone';
import { isValidEmail } from '@/lib/email';

// Public route (see middleware): signed-out visitors ask the office to add them to the app
export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.JOIN_REQUEST_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('JOIN_REQUEST_WEBHOOK_URL is not set');
      return NextResponse.json({ success: false, message: 'Join requests are not configured' }, { status: 500 });
    }

    const body = await request.json();
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';

    // Honeypot field that's hidden from people; bots that fill it get a fake success
    if (body.website) {
      return NextResponse.json({ success: true });
    }

    if (fullName.length < 2 || fullName.length > 100) {
      return NextResponse.json({ success: false, message: 'Invalid full name' }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ success: false, message: 'Invalid phone number' }, { status: 400 });
    }
    if (email && (email.length > 254 || !isValidEmail(email))) {
      return NextResponse.json({ success: false, message: 'Invalid email' }, { status: 400 });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        phone: toE164(phone),
        email: email || null,
        submittedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Join request error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
