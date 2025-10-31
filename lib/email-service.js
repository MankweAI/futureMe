const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendApplicationEmail(application) {
  const html = generateApplicationHTML(application);

  try {
    const { data, error } = await resend.emails.send({
      from: "FutureMe Applications <applications@futureme.co.za>",
      to: process.env.APPLICATION_EMAIL_TO,
      subject: `🎓 New Bursary Application - ${application.full_name}`,
      html: html,
      replyTo: application.email,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error };
    }

    console.log("✅ Application email sent:", data.id);
    return { success: true, emailId: data.id };
  } catch (error) {
    console.error("Email service error:", error);
    return { success: false, error: error.message };
  }
}

function generateApplicationHTML(app) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .section { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section-title { color: #667eea; font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .field { margin: 10px 0; }
    .label { font-weight: bold; color: #555; }
    .value { color: #333; margin-left: 10px; }
    .score-badge { display: inline-block; background: #667eea; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
    .priority-flag { background: #ffeaa7; padding: 10px; border-left: 4px solid #fdcb6e; margin: 10px 0; border-radius: 4px; }
    .bursary-match { background: #dfe6e9; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #0984e3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 New Bursary Application</h1>
      <p>Application Reference: <strong>${
        app.application_ref || "PENDING"
      }</strong></p>
      <p>Submitted: ${new Date().toLocaleString("en-ZA")}</p>
    </div>

    <div class="content">
      <!-- Personal Details -->
      <div class="section">
        <div class="section-title">👤 Personal Information</div>
        <div class="field"><span class="label">Full Name:</span><span class="value">${
          app.full_name
        }</span></div>
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

      <!-- Academic Profile -->
      <div class="section">
        <div class="section-title">🎓 Academic Profile</div>
        <div class="field"><span class="label">Academic Level:</span><span class="value">${
          app.academic_level
        }</span></div>
        <div class="field"><span class="label">Field of Study:</span><span class="value">${
          app.field_of_study
        }</span></div>
        <div class="field"><span class="label">Academic Average:</span><span class="value">${
          app.academic_average
        }%</span></div>
      </div>

      <!-- Financial Profile -->
      <div class="section">
        <div class="section-title">💰 Financial Information</div>
        <div class="field"><span class="label">Household Income:</span><span class="value">R${app.household_income?.toLocaleString(
          "en-ZA"
        )}/year</span></div>
        <div class="field"><span class="label">Income Bracket:</span><span class="value">${getIncomeBracket(
          app.household_income
        )}</span></div>
      </div>

      <!-- Motivation -->
      <div class="section">
        <div class="section-title">✍️ Motivation</div>
        <p>${app.motivation_text || "Not provided"}</p>
      </div>

      <!-- Eligibility Score -->
      <div class="section">
        <div class="section-title">🎯 Eligibility Assessment</div>
        <p><span class="score-badge">Score: ${
          app.eligibility_score || 85
        }/100</span></p>
        <div class="priority-flag">
          <strong>🏆 Recommended for:</strong> ${(app.matched_bursaries || [])
            .map((b) => b.name)
            .join(", ")}
        </div>
      </div>

      <!-- Matched Bursaries -->
      <div class="section">
        <div class="section-title">🎁 Matched Bursaries</div>
        ${(app.matched_bursaries || [])
          .map(
            (b) => `
          <div class="bursary-match">
            <strong>${b.name}</strong> (${Math.round(
              b.match_score * 100
            )}% match)<br>
            <small>${b.reason}</small>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function getIncomeBracket(income) {
  if (income <= 350000) return "💚 Low Income (High Priority)";
  if (income <= 600000) return "💛 Middle Income";
  return "💙 High Income";
}

module.exports = { sendApplicationEmail };
