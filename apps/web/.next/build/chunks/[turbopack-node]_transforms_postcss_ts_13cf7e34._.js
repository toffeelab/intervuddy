module.exports = [
"[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/.worktrees/monorepo-nestjs/apps/web/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "chunks/cc677__pnpm_574ddb8c._.js",
  "chunks/[root-of-the-server]__df6f2b43._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/.worktrees/monorepo-nestjs/apps/web/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];