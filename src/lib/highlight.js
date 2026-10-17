import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import sql from "highlight.js/lib/languages/sql";
import java from "highlight.js/lib/languages/java";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import php from "highlight.js/lib/languages/php";
import ruby from "highlight.js/lib/languages/ruby";
import kotlin from "highlight.js/lib/languages/kotlin";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";

const LANGS = { javascript, typescript, python, xml, css, json, bash, sql, java, c, cpp, csharp, go, rust, php, ruby, kotlin, yaml, markdown };
Object.entries(LANGS).forEach(([name, def]) => hljs.registerLanguage(name, def));

const ALIASES = {
  js: "javascript", jsx: "javascript", mjs: "javascript", node: "javascript",
  ts: "typescript", tsx: "typescript",
  py: "python", python3: "python",
  html: "xml", htm: "xml", svg: "xml", vue: "xml",
  sh: "bash", shell: "bash", zsh: "bash", powershell: "bash",
  "c++": "cpp", "c#": "csharp", cs: "csharp", golang: "go", rs: "rust", rb: "ruby", kt: "kotlin",
  yml: "yaml", md: "markdown", jsonc: "json",
};

// Returns highlighted HTML (already escaped by highlight.js) for the given code.
export function highlightCode(code, lang = "") {
  const key = lang.toLowerCase();
  const name = ALIASES[key] || key;
  try {
    if (hljs.getLanguage(name)) return hljs.highlight(code, { language: name, ignoreIllegals: true }).value;
    // Untagged block: let highlight.js guess among the registered languages.
    if (!key && code.length < 20000) return hljs.highlightAuto(code).value;
  } catch {}
  return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
