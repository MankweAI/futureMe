const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendApplicationEmail(application) {
  const html = generateApplicationHTML(application);

  try {
    const { data, error } = await resend.emails.send({
      from:
        process.env.APPLICATION_EMAIL_FROM ||
        "TTI Bursaries Applications <applications@TTI Bursaries.co.za>",
      to: process.env.APPLICATION_EMAIL_TO || "dinoko2026@gmail.com",
      cc: application.email,
      subject: `🎓 New Bursary Application - ${application.full_name}`,
      html: html,
      replyTo: application.email,
    });

    if (error) {
      console.error("❌ Email send error:", error);
      return { success: false, error };
    }

    console.log("✅ Application email sent:", data.id);
    return { success: true, emailId: data.id };
  } catch (error) {
    console.error("❌ Email service error:", error);
    return { success: false, error: error.message };
  }
}

function generateApplicationHTML(app) {
  const matchedBursaries = app.matched_bursaries || [];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
    .container { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .header p { margin: 5px 0; opacity: 0.95; }
    .content { padding: 30px; }
    .section { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
    .section-title { color: #667eea; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; display: flex; align-items: center; gap: 10px; }
    .field { margin: 12px 0; display: flex; }
    .label { font-weight: 600; color: #555; min-width: 180px; }
    .value { color: #333; flex: 1; }
    .bursary-match { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #0984e3; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .bursary-match h3 { margin: 0 0 10px 0; color: #0984e3; font-size: 20px; }
    .match-score { display: inline-block; background: #0984e3; color: white; padding: 4px 12px; border-radius: 15px; font-size: 14px; font-weight: bold; }
    .motivation-text { background: white; padding: 15px; border-radius: 6px; font-style: italic; color: #555; line-height: 1.8; }
    .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 New Bursary Application</h1>
      <p><strong>Reference:</strong> ${app.application_ref || "PENDING"}</p>
      <p><strong>Submitted:</strong> ${new Date().toLocaleString("en-ZA", {
        dateStyle: "long",
        timeStyle: "short",
      })}</p>
    </div>

    <div class="content">
      <div class="section">
        <div class="section-title">👤 Personal Information</div>
        <div class="field"><span class="label">Full Name:</span><span class="value"><strong>${
          app.full_name
        }</strong></span></div>
        <div class="field"><span class="label">Email:</span><span class="value">${
          app.email
        }</span></div>
        <div class="field"><span class="label">Phone:</span><span class="value">${
          app.phone_number || app.wa_id
        }</span></div>
        <div class="field"><span class="label">Province:</span><span class="value">${
          app.province
        }</span></div>
      </div>

      <div class="section">
        <div class="section-title">🎓 Academic Profile</div>
        <div class="field"><span class="label">Academic Level:</span><span class="value">${
          app.academic_level
        }</span></div>
        <div class="field"><span class="label">Field of Study:</span><span class="value"><strong>${
          app.field_of_study
        }</strong></span></div>
        <div class="field"><span class="label">Academic Average:</span><span class="value">${
          app.academic_average
        }%</span></div>
      </div>

      <div class="section">
        <div class="section-title">💰 Financial Information</div>
        <div class="field"><span class="label">Household Income:</span><span class="value">R${(
          app.household_income || 0
        ).toLocaleString("en-ZA")}/year</span></div>
      </div>

      <div class="section">
        <div class="section-title">✍️ Motivation</div>
        <div class="motivation-text">"${
          app.motivation_text || "Not provided"
        }"</div>
      </div>

      <div class="section">
        <div class="section-title">🎁 Matched Bursaries</div>
        ${matchedBursaries
          .map(
            (b) => `
          <div class="bursary-match">
            <h3>${b.name} <span class="match-score">${Math.round(
              b.match_score * 100
            )}% Match</span></h3>
            <div class="field"><span class="label">Funder:</span><span class="value">${
              b.funder || "N/A"
            }</span></div>
            <div class="field"><span class="label">Amount:</span><span class="value"><strong>${
              b.amount || "Varies"
            }</strong></span></div>
            <div class="field"><span class="label">Deadline:</span><span class="value">${
              b.deadline || "TBC"
            }</span></div>
            <div class="field"><span class="label">Reason:</span><span class="value">${
              b.reason
            }</span></div>
          </div>
        `
          )
          .join("")}
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <p style="font-size: 16px; color: #667eea; font-weight: bold;">📧 Contact applicant: ${
          app.email
        }</p>
      </div>
    </div>

    <div class="footer">
      <p><strong>TTI Bursaries</strong> - Empowering South African Youth</p>
      <p>Automated Application System | Powered by AI</p>
    </div>
  </div>
</body>
</html>
  `;
}

module.exports = { sendApplicationEmail };
