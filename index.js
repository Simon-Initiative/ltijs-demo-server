require("dotenv").config();
const path = require("path");
const routes = require("./src/routes");
const Database = require("ltijs-sequelize");
const fs = require("fs");
const YAML = require("js-yaml");

const lti = require("ltijs").Provider;

const db = new Database(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    logging: false,
  }
);

// Setup
lti.setup(
  process.env.LTI_KEY,
  {
    plugin: db,
  },
  {
    staticPath: path.join(__dirname, "./public"), // Path to static files
    cookies: {
      secure: false, // Set secure to true if the testing platform is in a different domain and https is being used
      sameSite: "", // Set sameSite to 'None' if the testing platform is in a different domain and https is being used
    },
    devMode: true, // Set DevMode to true if the testing platform is in a different domain and https is not being used
  }
);

// When receiving successful LTI launch redirects to app
lti.onConnect(async (token, req, res) => {
  return res.sendFile(path.join(__dirname, "./public/index.html"));
});

// When receiving deep linking request redirects to deep screen
lti.onDeepLinking(async (token, req, res) => {
  return lti.redirect(res, "/deeplink", { newResource: true });
});

// Setting up routes
lti.app.use(routes);

// Setup function
const setup = async () => {
  await lti.deploy({ port: process.env.PORT });

  try {
    const config = YAML.load(fs.readFileSync("platforms.yml", "utf8"));

    if (config.platforms) {
      for (const platform of config.platforms) {
        await lti.registerPlatform(platform);
      }
    }
  } catch (e) {
    console.debug(e);
    console.log("No platforms.yml file found. Skipping platform registration.");
  }

  // lti.deletePlatform("http://localhost", "10000000001");
};

setup();
