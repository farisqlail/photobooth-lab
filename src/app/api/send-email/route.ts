import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, photoUrl, videoUrl, gifUrl } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check environment variable
    if (!process.env.RESEND_API_KEY) {
       console.error("RESEND_API_KEY is missing");
       // Return a specific error so frontend can show instructions
       return NextResponse.json({ error: 'Configuration Missing: RESEND_API_KEY not found in environment variables.' }, { status: 500 });
    }

    const { data, error } = await resend.emails.send({
      from: 'Photobooth <onboarding@resend.dev>', // Default testing domain
      to: [email],
      subject: 'Your Photobooth Memories are Ready! 📸',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h1 style="text-align: center; color: #333;">Here are your photos!</h1>
          <p style="text-align: center; color: #666;">Thank you for using our Photobooth. Click the buttons below to download your captures:</p>
          
          <div style="margin: 30px 0; display: flex; flex-direction: column; gap: 10px;">
            <a href="${photoUrl}" style="display: block; padding: 15px; background: #000; color: #fff; text-decoration: none; text-align: center; border-radius: 8px; font-weight: bold;">Download Photo</a>
            
            ${gifUrl ? `<a href="${gifUrl}" style="display: block; padding: 15px; background: #444; color: #fff; text-decoration: none; text-align: center; border-radius: 8px; font-weight: bold;">Download GIF Animation</a>` : ''}
            
            ${videoUrl ? `<a href="${videoUrl}" style="display: block; padding: 15px; background: #444; color: #fff; text-decoration: none; text-align: center; border-radius: 8px; font-weight: bold;">Download Live Video</a>` : ''}
          </div>

          <p style="text-align: center; font-size: 12px; color: #999;">Note: These links are valid for 7 days.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
