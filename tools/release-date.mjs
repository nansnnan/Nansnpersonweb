import process from 'node:process';

const SOURCES = ['https://www.baidu.com', 'https://github.com'];

async function main() {
  for (const url of SOURCES) {
    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      const header = response.headers.get('date');
      if (!header) continue;

      const date = new Date(header);
      if (Number.isNaN(date.getTime())) continue;

      const formatted = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);

      console.log(formatted);
      return;
    } catch {
      // 换下一个时间源
    }
  }

  console.error('无法从网络获取时间，请检查网络后重试。');
  process.exit(1);
}

main();
