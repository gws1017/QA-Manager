import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const FROM = `"QA Manager" <${process.env.GMAIL_USER}>`;

export async function sendVerificationCode(email: string, code: string) {
  await transporter.sendMail({
    from: FROM, to: email,
    subject: '[QA Manager] 이메일 인증 코드',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1f3864;margin-bottom:8px">이메일 인증</h2>
        <p style="color:#555;margin-bottom:24px">아래 6자리 코드를 입력해 이메일을 인증하세요. 코드는 5분간 유효합니다.</p>
        <div style="background:#f4f6fb;border-radius:8px;padding:20px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:bold;color:#1f3864">
          ${code}
        </div>
        <p style="color:#aaa;font-size:12px;margin-top:24px">본인이 요청하지 않은 경우 이 메일을 무시하세요.</p>
      </div>
    `,
  });
}

export async function sendAssignedNotification(email: string, opts: {
  assignee: string; issueId: string; title: string; projectName: string;
}) {
  await transporter.sendMail({
    from: FROM, to: email,
    subject: `[QA Manager] 이슈 담당자로 배정됨 · ${opts.issueId}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1f3864;margin-bottom:8px">담당자 배정 알림</h2>
        <p style="color:#555"><strong>${opts.assignee}</strong>님이 이슈의 담당자로 배정되었습니다.</p>
        <div style="background:#f4f6fb;border-radius:8px;padding:16px;margin:16px 0">
          <div style="font-size:12px;color:#888">${opts.projectName}</div>
          <div style="font-weight:bold;color:#1f3864">${opts.issueId}</div>
          <div style="color:#333;margin-top:4px">${opts.title || '(제목 없음)'}</div>
        </div>
      </div>
    `,
  });
}

export async function sendStatusChangeNotification(email: string, opts: {
  issueId: string; title: string; projectName: string; oldStatus: string; newStatus: string;
}) {
  await transporter.sendMail({
    from: FROM, to: email,
    subject: `[QA Manager] 이슈 상태 변경 · ${opts.issueId}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1f3864;margin-bottom:8px">이슈 상태 변경 알림</h2>
        <div style="background:#f4f6fb;border-radius:8px;padding:16px;margin:16px 0">
          <div style="font-size:12px;color:#888">${opts.projectName}</div>
          <div style="font-weight:bold;color:#1f3864">${opts.issueId}</div>
          <div style="color:#333;margin-top:4px">${opts.title || '(제목 없음)'}</div>
        </div>
        <p style="color:#555">
          <span style="color:#888">${opts.oldStatus}</span>
          &nbsp;→&nbsp;
          <strong style="color:#1f3864">${opts.newStatus}</strong>
        </p>
      </div>
    `,
  });
}
