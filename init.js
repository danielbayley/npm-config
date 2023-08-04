const { execSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const shell = command => execSync(command).toString().trim()

const npmrc = key => {
  key = key.replace(/\W/g, "_")
  return config.env[`npm_config_${key}`]
}

const format = {
  url: domain => "https://" + domain.replace(/^https?:\/+|\/$/g, ""),

  author: input => {
    const [author, email, url] = input
      .split(/[(<,>)]/)
      .map(i => i.trim())
      .filter(Boolean)
    return { name: author, email, url }
  },

  sentence: text => text
    .replace(/[^\w,\s!?…]+/g, "")
    .trim()
    .replace(/([^!?…])$/, punct => `${punct}.`),

  description: md => {
    const lines = md.split("\n").filter(Boolean)
    const heading = /^(#|[=-]{2,})/
    const headings = (line, i) => !heading.test(line) && !heading.test(lines[i + 1])
    const [description] = lines.filter(headings)
    return format.sentence(description)
  },
}

globalThis.config ??= process
let { platform, cwd } = config
const { GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL, GITHUB_USER } = process.env
if (typeof cwd !== "string") cwd = config.cwd()
const github = "https://github.com"
let owner = "{owner}"

const node = ">=18"
const files = ["index.js"]

const npm = process.env._.split(path.sep).pop()
const v = shell(`${npm} --version`)
const packageManager = `${npm}@${v}`

let skip = npm === "pnpm"
skip ||= ["-y", "--yes"].some(flag => process.argv.includes(flag))

if (fs.existsSync(".git")) {
  const json = JSON.parse(shell(`gh api repos/${owner}/{repo}`))

  var { name, description, topics, homepage, html_url, license } = json
  license = license.spdx_id
} else {
  owner = shell(`git config credential.${github}.username`)
  name = path
    .basename(cwd)
    .replace(/[^A-Za-z0-9]+/g, "-")
    .toLowerCase()
  keywords = name.split("-")

  const [readme] = fs.readdirSync(cwd).filter(file => /README*/i.test(file))
  if (readme) description = format.description(fs.readFileSync(readme, "utf-8"))
}

const version = npmrc("init-version") || "0.0.0"

owner = JSON.parse(shell(`gh api users/${owner}`))
let { login, name: author, email, blog: url } = owner
owner = login

const repository = [github, owner, name].join(path.sep)

format.scope = name => process.argv.includes("--scope") ? `@${owner}/${name}` : name
name = format.scope(name)

homepage = new URL(homepage || repository)
if (homepage.origin === github) homepage.hash ||= "readme"

author  ||= npmrc("init-author-name")  || GIT_AUTHOR_NAME  || shell("git config user.name | id -F")
email     = npmrc("init-author-email") || GIT_AUTHOR_EMAIL || shell("git config user.email") || email
url     ||= npmrc("init-author-url")   || html_url || owner.html_url
license ||= npmrc("init-license")      || "MIT"

module.exports = {
  name:        skip ? name        : prompt("name", name, format.scope),
  version:     skip ? version     : prompt("version", version),
  description: skip ? description : prompt("description", description, format.sentence),
  keywords:    skip ? topics      : prompt("keywords", topics?.join(), input => input.split(/\W+/)),
  homepage:    skip ? homepage    : prompt("homepage", homepage.href, format.url),
  repository:  skip ? repository  : prompt("repository", repository, format.url),
  bugs: `${repository}/issues`,
  author:  skip ? author  : prompt("author", `${author} <${email}> (${url})`, format.author),
  license: skip ? license : prompt("license", license),

  os: [platform],
  engines: { node },
  type: "module",
  exports: files[0],
  files,
  packageManager,
  devDependencies: {},
  dependencies: {},
  scripts: {}
}
