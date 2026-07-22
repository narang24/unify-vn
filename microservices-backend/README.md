## Things to do on your side
1. Run `npm run db:push` (or generate a migration) after pulling the schema changes — new `sprints` table + new `work_items` columns.
2. `backend/src/index.ts` and `backend/dist/*` are a **monolith duplicate** of the auth+workspace services with the old MongoDB code — since you asked for a microservices architecture, delete `backend/src/index.ts`'s route logic (or repurpose it as a thin API gateway that proxies to `:4001` auth and `:4002` workspace) rather than running all three at once.
3. `frontend/src/app/dashboard/page.tsx` still keeps the localStorage fallback so the board is usable before the workspace API is fully wired up — swap it out once `GET /workspaces/:id/spaces` and `GET /spaces/:id/work_items` are returning real data end to end.
4. Subtasks: the dialog currently creates top-level items; wire a "parentId" picker when you want subtasks nested under a story/task/bug (the schema/route already support it).
