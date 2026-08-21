# create-cocoframe

Dependency-free project creator for [CocoFrame](https://github.com/wiryosaputraofficial/cocoframe).

After the public CocoFrame runtime packages are released:

~~~bash
npm create cocoframe@latest my-app
cd my-app
npm run dev
~~~

For development from the CocoFrame repository:

~~~bash
npm run create -- examples/my-app --skip-install
npm install
npm run dev --workspace=my-app
~~~

## Options

- --package-manager npm|pnpm|yarn|bun selects the installer.
- --skip-install or --no-install only writes the starter files.
- --help prints usage.
- --version prints the creator version.

The creator refuses filesystem roots and non-empty target directories. The starter includes a server-rendered page, a typed API route, an opt-in counter island, responsive CSS, TypeScript configuration, and production scripts.