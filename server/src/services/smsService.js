/**
 * SMS Provider Abstraction
 * 
 * In production, configure environment variables:
 * SMS_PROVIDER=TWILIO (or FAST2SMS, AWS_SNS)
 * TWILIO_ACCOUNT_SID=...
 * TWILIO_AUTH_TOKEN=...
 * TWILIO_PHONE_NUMBER=...
 * 
 * In development mode or when no SMS provider is configured,
 * it runs in clearly-marked DEVELOPMENT OTP MODE:
 * logs the OTP explicitly to server console and returns metadata
 * so tests and development workflows operate seamlessly without
 * falsely claiming an SMS was delivered over carrier networks.
 */

async function sendOtp({ mobileNumber, otp, facultyName, purpose = 'attendance editing' }) {
  const provider = process.env.SMS_PROVIDER || 'DEV_CONSOLE';

  const messageText = `Your Academic Portal verification OTP for ${purpose} is ${otp}. Valid for 5 minutes. Do not share this with anyone.`;

  if (provider.toUpperCase() === 'DEV_CONSOLE' || !process.env.TWILIO_ACCOUNT_SID) {
    // Clearly marked development mode
    console.log(`=======================================================`);
    console.log(`[SMS DEV OTP MODE] (No external SMS provider configured)`);
    console.log(`Recipient: ${facultyName || 'Faculty Member'} (${mobileNumber})`);
    console.log(`Purpose  : ${purpose}`);
    console.log(`OTP Code : >>> ${otp} <<< (Expires in 5 minutes)`);
    console.log(`Time     : ${new Date().toISOString()}`);
    console.log(`=======================================================`);

    return {
      success: true,
      provider: 'DEV_CONSOLE',
      isDevelopmentMode: true,
      message: `[DEV MODE] OTP generated for registered mobile (${mobileNumber.slice(-4).padStart(mobileNumber.length, '*')}). Check server logs or use the code shown.`,
      devOtpHint: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  // Example Twilio integration if configured
  try {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: messageText,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`,
    });

    return {
      success: true,
      provider: 'TWILIO',
      isDevelopmentMode: false,
      message: `Verification OTP successfully dispatched via SMS to registered mobile ending in ${mobileNumber.slice(-4)}.`,
    };
  } catch (error) {
    console.error('[SMS Provider Error]:', error.message);
    throw new Error('Failed to dispatch SMS through the configured provider.');
  }
}

module.exports = {
  sendOtp,
};
