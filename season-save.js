(() => {
  'use strict';

  const FORMAT = 'nansn-season-save';
  const FORMAT_VERSION = 1;
  const MAX_FILE_BYTES = 100 * 1024 * 1024;
  const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
  const MAX_GRAPH_NODES = 500000;

  function encodeGraph(root) {
    const nodes = [];
    const seen = new Map();

    function encodeValue(value) {
      if (value === null) return null;

      const type = typeof value;
      if (type === 'string' || type === 'boolean') return value;
      if (type === 'number') {
        return Number.isFinite(value) ? value : { n: String(value) };
      }
      if (type === 'undefined') return { u: 1 };
      if (type === 'bigint') return { b: String(value) };
      if (type !== 'object') {
        throw new Error(`无法导出的数据类型：${type}`);
      }

      if (seen.has(value)) return { r: seen.get(value) };

      const id = nodes.length;
      seen.set(value, id);
      nodes.push(null);

      const tag = Object.prototype.toString.call(value);
      if (Array.isArray(value)) {
        nodes[id] = { t: 'a', v: value.map(encodeValue) };
      } else if (tag === '[object Date]') {
        nodes[id] = { t: 'd', v: value.toISOString() };
      } else if (tag === '[object Map]') {
        nodes[id] = {
          t: 'm',
          v: [...value.entries()].map(([key, item]) => [encodeValue(key), encodeValue(item)])
        };
      } else if (tag === '[object Set]') {
        nodes[id] = { t: 's', v: [...value].map(encodeValue) };
      } else if (tag === '[object Object]') {
        nodes[id] = {
          t: 'o',
          v: Object.keys(value).map((key) => [key, encodeValue(value[key])])
        };
      } else {
        throw new Error(`无法导出的对象类型：${tag}`);
      }

      return { r: id };
    }

    const rootRef = encodeValue(root);
    return { root: rootRef, nodes };
  }

  function decodeGraph(graph) {
    if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length > MAX_GRAPH_NODES) {
      throw new Error('存档数据结构不正确');
    }
    if (!graph.root || typeof graph.root !== 'object') {
      throw new Error('存档根节点不正确');
    }

    const nodes = graph.nodes.map((node) => {
      if (!node || typeof node !== 'object') throw new Error('存档节点损坏');
      switch (node.t) {
        case 'a':
          return [];
        case 'o':
          return {};
        case 'm':
          return new Map();
        case 's':
          return new Set();
        case 'd':
          return new Date(node.v);
        default:
          throw new Error('存档包含未知节点类型');
      }
    });

    function decodeValue(value) {
      if (value === null || typeof value !== 'object') return value;
      if (Object.prototype.hasOwnProperty.call(value, 'r')) {
        const id = value.r;
        if (!Number.isInteger(id) || id < 0 || id >= nodes.length) {
          throw new Error('存档引用了不存在的节点');
        }
        return nodes[id];
      }
      if (Object.prototype.hasOwnProperty.call(value, 'u')) return undefined;
      if (Object.prototype.hasOwnProperty.call(value, 'n')) return Number(value.n);
      if (Object.prototype.hasOwnProperty.call(value, 'b')) return BigInt(value.b);
      throw new Error('存档包含未知值类型');
    }

    graph.nodes.forEach((node, index) => {
      const target = nodes[index];
      if (!Array.isArray(node.v) && (node.t === 'a' || node.t === 'm' || node.t === 's' || node.t === 'o')) {
        throw new Error('存档节点内容损坏');
      }

      if (node.t === 'a') {
        node.v.forEach((item) => target.push(decodeValue(item)));
      } else if (node.t === 'o') {
        node.v.forEach(([key, item]) => {
          Object.defineProperty(target, key, {
            value: decodeValue(item),
            enumerable: true,
            configurable: true,
            writable: true
          });
        });
      } else if (node.t === 'm') {
        node.v.forEach(([key, item]) => target.set(decodeValue(key), decodeValue(item)));
      } else if (node.t === 's') {
        node.v.forEach((item) => target.add(decodeValue(item)));
      }
    });

    return decodeValue(graph.root);
  }

  function createFile({ mode, appVersion, label, state }) {
    return {
      format: FORMAT,
      version: FORMAT_VERSION,
      mode,
      appVersion: String(appVersion || ''),
      label: String(label || ''),
      savedAt: new Date().toISOString(),
      graph: encodeGraph(state)
    };
  }

  function parseFile(text) {
    if (typeof text !== 'string' || text.length === 0) {
      throw new Error('存档文件为空');
    }
    if (text.length > MAX_FILE_BYTES) {
      throw new Error('存档文件过大');
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('存档文件不是有效的 JSON');
    }

    if (!data || data.format !== FORMAT) {
      throw new Error('这不是本站的赛季存档文件');
    }
    if (data.version !== FORMAT_VERSION) {
      throw new Error(`存档版本不兼容：${data.version || '未知'}`);
    }

    return {
      mode: data.mode,
      appVersion: data.appVersion || '',
      label: data.label || '',
      savedAt: data.savedAt || '',
      state: decodeGraph(data.graph)
    };
  }

  async function compressText(text) {
    if (typeof CompressionStream !== 'function') return null;
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function decompressBuffer(buffer) {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('当前浏览器不支持解压压缩存档');
    }
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  function filename(mode, compressed = true) {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    const stamp = [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join('') + '-' + [pad(date.getHours()), pad(date.getMinutes())].join('');
    const extension = compressed && typeof CompressionStream === 'function' ? '.json.gz' : '.json';
    return `nansn-${mode}-save-${stamp}${extension}`;
  }

  async function download(save, name) {
    const text = JSON.stringify(save);
    let blob;
    let finalName = name;

    try {
      const compressed = await compressText(text);
      if (compressed) {
        blob = new Blob([compressed], { type: 'application/gzip' });
        if (!finalName.endsWith('.gz')) finalName += '.gz';
      } else {
        blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      }
    } catch {
      blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      if (finalName.endsWith('.gz')) finalName = finalName.slice(0, -3);
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return finalName;
  }

  async function readFile(file) {
    if (!file) throw new Error('没有选择存档文件');
    if (file.size > MAX_UPLOAD_BYTES) throw new Error('存档文件过大');

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const gzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    const text = gzip ? await decompressBuffer(buffer) : new TextDecoder().decode(bytes);
    return parseFile(text);
  }

  window.NansnSeasonSave = {
    format: FORMAT,
    version: FORMAT_VERSION,
    createFile,
    parseFile,
    readFile,
    filename,
    download
  };
})();
