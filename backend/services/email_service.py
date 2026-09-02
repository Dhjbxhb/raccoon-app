"""
Transactional email sending via Resend.

Both send functions fall back to logging the code if actual delivery fails
(e.g. the sending domain isn't verified in Resend yet), so the flows keep
working end-to-end. Once the domain is verified, delivery starts working
automatically with no further code changes needed.
"""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'Raccoon App <noreply@raccoon.com.co>')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://raccoon.com.co')

RESEND_API_URL = 'https://api.resend.com/emails'


async def _send_email(to_email: str, subject: str, html: str) -> bool:
    """Sends an email via Resend. Returns True only if actually delivered."""
    if not RESEND_API_KEY:
        return False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                RESEND_API_URL,
                headers={'Authorization': f'Bearer {RESEND_API_KEY}'},
                json={'from': EMAIL_FROM, 'to': [to_email], 'subject': subject, 'html': html}
            )
        if response.status_code >= 400:
            logger.warning(f"Resend send failed ({response.status_code}): {response.text}")
            return False
        return True
    except Exception as e:
        logger.warning(f"Resend send error: {e}")
        return False


def _email_wrapper(preheader: str, body_html: str) -> str:
    """Shared HTML shell for all transactional emails - mascot header,
    consistent footer."""
    mascot_url = f"{FRONTEND_URL}/assets/raccoon-mascot.png"
    return f"""
    <div style="display:none;max-height:0;overflow:hidden;">{preheader}</div>
    <body style="margin:0;padding:0;background-color:#0a0818;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0818;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:linear-gradient(180deg,#1a1530,#120e24);border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
              <tr>
                <td align="center" style="padding:36px 32px 8px 32px;">
                  <img src="{mascot_url}" width="72" height="72" alt="Raccoon App" style="border-radius:50%;display:block;margin:0 auto 16px auto;box-shadow:0 0 24px rgba(124,58,237,0.5);" />
                  <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;">Raccoon App</div>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 36px 36px 36px;font-family:Arial,sans-serif;color:#d1d5db;font-size:15px;line-height:1.6;">
                  {body_html}
                </td>
              </tr>
            </table>
            <p style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;margin-top:20px;">
              Raccoon App &middot; This is an automated message, please don't reply.
            </p>
          </td>
        </tr>
      </table>
    </body>
    """


def _code_html(code: str) -> str:
    """Large, letter-spaced display of a one-time code."""
    return f"""
    <div style="text-align:center;margin:28px 0;">
      <div style="display:inline-block;background-color:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);border-radius:12px;padding:16px 36px;">
        <span style="font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:#ffffff;">{code}</span>
      </div>
    </div>
    """


async def send_password_reset_email(to_email: str, code: str) -> None:
    """Sends the password-reset code, or logs it if delivery fails."""
    body = f"""
      <h1 style="font-family:Arial,sans-serif;color:#ffffff;font-size:22px;margin:0 0 12px 0;text-align:center;">
        Reset your password
      </h1>
      <p style="text-align:center;margin:0 0 4px 0;">
        We received a request to reset the password on your Raccoon App account.
      </p>
      <p style="text-align:center;margin:0;">Enter this code on the reset page to continue.</p>
      {_code_html(code)}
      <p style="text-align:center;font-size:13px;color:#9ca3af;margin:0 0 4px 0;">
        This code expires in 15 minutes.
      </p>
      <p style="text-align:center;font-size:13px;color:#9ca3af;margin:0;">
        Didn't request this? You can safely ignore this email.
      </p>
    """
    html = _email_wrapper('Your Raccoon App password reset code', body)

    delivered = await _send_email(to_email, 'Your Raccoon App password reset code 🦝', html)
    if not delivered:
        logger.warning(
            f"[EMAIL NOT DELIVERED - code logged for manual testing] "
            f"Password reset code for {to_email}: {code}"
        )


async def send_verification_email(to_email: str, code: str) -> None:
    """Sends the email-verification code, or logs it if delivery fails."""
    body = f"""
      <h1 style="font-family:Arial,sans-serif;color:#ffffff;font-size:22px;margin:0 0 12px 0;text-align:center;">
        Verify your email
      </h1>
      <p style="text-align:center;margin:0 0 4px 0;">
        Thanks for signing up for Raccoon App! Enter this code to confirm your email address.
      </p>
      {_code_html(code)}
      <p style="text-align:center;font-size:13px;color:#9ca3af;margin:0 0 4px 0;">
        This code expires in 15 minutes.
      </p>
      <p style="text-align:center;font-size:13px;color:#9ca3af;margin:0;">
        Didn't create this account? You can safely ignore this email.
      </p>
    """
    html = _email_wrapper('Your Raccoon App verification code', body)

    delivered = await _send_email(to_email, 'Your Raccoon App verification code 🦝', html)
    if not delivered:
        logger.warning(
            f"[EMAIL NOT DELIVERED - code logged for manual testing] "
            f"Verification code for {to_email}: {code}"
        )
