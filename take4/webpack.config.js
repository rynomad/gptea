const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { DefinePlugin } = require("webpack");
const merge = require("deepmerge");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const appDirectory = path.resolve(__dirname, "src");

const getEntries = (dir, pattern) => {
  const entries = [];
  const folders = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory());

  for (const folder of folders) {
    const folderPath = path.join(dir, folder.name);
    const filePath = path.join(folderPath, pattern);
    if (fs.existsSync(filePath)) {
      entries.push(filePath);
    }
    entries.push(...getEntries(folderPath, pattern));
  }

  return entries;
};

const generateEntryPoints = () => {
  const entryPoints = {};

  const pages = getEntries(appDirectory + "/pages", "index.ts").concat(
    getEntries(appDirectory + "/pages", "index.tsx")
  );
  const scripts = getEntries(appDirectory + "/scripts", "index.ts").concat(
    getEntries(appDirectory + "/scripts", "index.js")
  );

  pages.forEach((filePath) => {
    const name = path.dirname(path.relative(appDirectory, filePath));
    entryPoints[name] = filePath;
  });

  scripts.forEach((filePath) => {
    const name = path.dirname(path.relative(appDirectory, filePath));
    entryPoints[name] = filePath;
  });

  return entryPoints;
};

const generateHtmlPlugins = () => {
  const htmlFiles = getEntries(appDirectory, "index.html");

  return htmlFiles.map(
    (filePath) =>
      new HtmlWebpackPlugin({
        template: filePath,
        filename: `${path.dirname(path.relative(appDirectory, filePath))}.html`,
        chunks: [`${path.dirname(path.relative(appDirectory, filePath))}`],
      })
  );
};

const getManifestFragments = () => {
  const fragments = getEntries(appDirectory, "manifest.fragment.json");
  const manifests = fragments.map((fragmentPath) =>
    JSON.parse(fs.readFileSync(fragmentPath, "utf-8"))
  );
  return merge.all(manifests);
};

const mainManifest = JSON.parse(
  fs.readFileSync(path.join(appDirectory, "manifest.json"), "utf-8")
);
const mergedManifest = merge(mainManifest, getManifestFragments());
fs.writeFileSync(
  path.join("dist", "manifest.json"),
  JSON.stringify(mergedManifest, null, 2)
);

const indexPages = getEntries(appDirectory + "/pages", "index.ts")
  .concat(getEntries(appDirectory + "/pages", "index.tsx"))
  .reduce((acc, entry) => {
    const pageName = path.relative(appDirectory, entry).split(path.sep)[1];
    acc[pageName] = `/pages/${pageName}.html`;
    return acc;
  }, {});

module.exports = {
  entry: {
    background: "./src/background.ts",
    ...generateEntryPoints(),
    ...getEntries(appDirectory, "index.css").reduce((acc, entry) => {
      const key = `scripts_${path.dirname(path.relative(appDirectory, entry))}`;
      acc[key] = entry;
      return acc;
    }, {}),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js",
    publicPath: "/",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: "[name].css" }),
    new DefinePlugin({ PAGE_INDEX: JSON.stringify(indexPages) }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "src/pages/jitsi/external_api.js",
          to: "pages/jitsi/external_api.js",
        },
      ],
    }),
    ...generateHtmlPlugins(),
  ],
};
