const { execSync } = require("node:child_process")
const { existsSync: exists } = require("node:fs")
const path = require("node:path")

const sh = command => execSync(command).toString().trim()

const npmrc = key => {
  key = key.replace(/\W/g, "_")
  const value = config.env[`npm_config_${key}`]
  if (!value.startsWith("${")) return value
}

const { GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL, GITHUB_USER } = process.env
const { platform, cwd } = config
const github = "https://github.com"

let owner = "{owner}"

if (exists(".git")) {
  const json = JSON.parse(sh(`gh api repos/${owner}/{repo}`))
  var { name, description, topics: keywords, homepage, html_url, license } = json
  license = license.spdx_id
  description = description.replace(/[^\w,\s]+/g, "").trim() + "."
}
else {
  owner = sh(`git config credential.${github}.username`)
  name = path.basename(cwd).replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()
  keywords = name.split("-")
  homepage = [github, owner, name].join(path.sep)
}

const version = npmrc("init-version") || "0.0.0"

if (homepage.startsWith(github) && !homepage.includes("#")) homepage += "#readme"

owner = JSON.parse(sh(`gh api users/${owner}`))
let { login, name: author, email, blog } = owner
owner = login
author  ||= npmrc("init-author-name")  || GIT_AUTHOR_NAME  || sh("git config user.name | id -F")
email     = npmrc("init-author-email") || GIT_AUTHOR_EMAIL || sh("git config user.email") || email
blog    ||= npmrc("init-author-url")   || html_url || owner.html_url
license ||= npmrc("init-license")      || "MIT"

const main = "index.js"

module.exports = {
  name,
  version,
  description,
  keywords,
  homepage,
  repository: `${owner}/${name}`,
  bugs: `${github}/${owner}/${name}/issues`,
  author: { name: author, email, url: blog },
  license,

  os: [platform],
  engines: { node: ">=18" },
  type: "module",
  main,
  files: [main]
}
