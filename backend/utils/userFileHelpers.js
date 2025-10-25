const path = require('path');
const UserFile = require('../models/userFileModel');

const SUPPORTED_LANGUAGES = {
  python: { extensions: ['.py'] },
  java: { extensions: ['.java'] },
  javascript: { extensions: ['.js'] },
  typescript: { extensions: ['.ts'] },
  go: { extensions: ['.go'] },
  ruby: { extensions: ['.rb'] },
  php: { extensions: ['.php'] },
  c: { extensions: ['.c'] },
  cpp: { extensions: ['.cpp', '.cc', '.cxx'] }
};

const LANGUAGE_ALIASES = {
  node: 'javascript',
  nodejs: 'javascript',
  'c++': 'cpp'
};

function isSupportedLanguage(language) {
  if (!language) return false;
  return Object.prototype.hasOwnProperty.call(SUPPORTED_LANGUAGES, language.toLowerCase());
}

function detectLanguage({ filename, language }) {
  if (language) {
    const normalized = language.toLowerCase();
    const canonical = isSupportedLanguage(normalized)
      ? normalized
      : LANGUAGE_ALIASES[normalized];
    if (!canonical || !isSupportedLanguage(canonical)) {
      throw new Error(`Language '${language}' is not supported`);
    }
    return canonical;
  }

  if (filename) {
    const extension = path.extname(filename).toLowerCase();
    const match = Object.entries(SUPPORTED_LANGUAGES)
      .find(([, meta]) => meta.extensions.includes(extension));
    if (match) {
      return match[0];
    }
  }

  const supportedExt = Object.values(SUPPORTED_LANGUAGES)
    .flatMap((meta) => meta.extensions)
    .join(', ');
  throw new Error(`Unable to determine language from filename. Supported extensions: ${supportedExt}`);
}

async function persistUserFile({ userId, filename, language, content, origin }) {
  if (!userId) {
    throw new Error('User ID is required to store a file');
  }
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename is required');
  }
  if (!content || typeof content !== 'string') {
    throw new Error('File content is required');
  }
  const normalizedLanguage = detectLanguage({ filename, language });
  const size = Buffer.byteLength(content, 'utf8');

  const doc = await UserFile.findOneAndUpdate(
    { userId, filename },
    {
      $set: {
        language: normalizedLanguage,
        content,
        size,
        origin
      },
      $setOnInsert: {
        userId,
        filename
      }
    },
    {
      new: true,
      upsert: true,
      runValidators: true
    }
  );

  return doc;
}

module.exports = {
  SUPPORTED_LANGUAGES,
  detectLanguage,
  persistUserFile,
  isSupportedLanguage
};
