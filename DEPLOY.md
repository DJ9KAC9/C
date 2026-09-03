# Deploying Ora

All paths in this build are **relative**, so the site works whether it's served
from the domain root, a subfolder, or even opened straight off your disk.
Test it before deploying: double-click `index.html` — it should look fully
designed (dark hero, serif headline). If it does, the files are fine and any
problem is in the upload step.

## Option A — command line (recommended, keeps one URL)

From inside this folder:

    npx vercel --prod

Answers: "Set up and deploy?" → Enter. Scope → alahijazeen28-5876's projects.
"Link to existing project?" → y → `ora-clinic`.

This uploads the folder tree exactly as it is, including `css/`, `js/` and
`assets/`. It is the reliable route.

## Option B — drag and drop

vercel.com/new → "Deploy without Git".

**Drag the folder itself — not its contents, not the .zip.** If you open the
folder and select the files inside, some browsers drop the subfolders, and you
get a page with no styling and no images. That is what went wrong last time.

## Checking a deploy worked

Open the URL and add `/css/style.css` to it. You should see stylesheet code.
If you get 404, the css folder didn't upload — redo with Option A.

Pages: `/` · `/book` · `/book?fast=1` · `/lounge` · `/consult` · `/pro`
