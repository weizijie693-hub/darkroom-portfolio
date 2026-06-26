/**
 * 暗房工作室 — CSP 违规报告 Worker
 *
 * 部署方式:
 *   1. 打开 Cloudflare Dashboard → Workers & Pages → Create → Worker
 *   2. 粘贴此文件内容 → 部署
 *   3. 绑定自定义域名（可选），或直接用 *.workers.dev 域名
 *   4. 将返回的 URL 填入 _headers 的 report-uri 中
 *
 * 免费方案替代:
 *   - report-uri.com 免费档（500条/月）
 *   - 此 Worker 接收后转发到你的邮箱/Webhook
 */

export default {
  async fetch(request) {
    // 只接受 POST（CSP 报告以 POST JSON 发送）
    if (request.method !== 'POST') {
      return new Response('CSP Report Endpoint — POST only', { status: 405 });
    }

    try {
      const report = await request.json();

      // 解析 CSP 报告
      const cspReport = report['csp-report'];
      if (!cspReport) return new Response('OK', { status: 200 });

      // 提取关键信息
      const summary = {
        timestamp: new Date().toISOString(),
        blocked: cspReport['blocked-uri'] || '(空)',
        directive: cspReport['violated-directive'] || '(空)',
        document: cspReport['document-uri'] || '(空)',
        referrer: cspReport['referrer'] || '(空)',
        scriptSample: (cspReport['script-sample'] || '').slice(0, 80),
        userAgent: request.headers.get('User-Agent') || '',
        ip: request.headers.get('CF-Connecting-IP') || '',
      };

      // 结构化日志（Cloudflare Workers 免费日志保留 24h）
      console.log(JSON.stringify(summary));

      // 可选: 转发到 Slack / Discord / 飞书 / Telegram Webhook
      // await fetch('https://hooks.slack.com/...', {
      //   method: 'POST',
      //   body: JSON.stringify({ text: '🚨 CSP Violation\n```' + JSON.stringify(summary, null, 2) + '```' }),
      // });

      return new Response('OK', { status: 200 });
    } catch (e) {
      return new Response('OK', { status: 200 }); // 收到非 JSON 也返回 200，避免重试风暴
    }
  },
};
