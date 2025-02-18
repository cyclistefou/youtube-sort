// This file renders the add-on dropdown menu.

const regex =
  /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?|embed\/|v\/)?)?.*(v=([\w\-]+)(?=&|\s|$))/i;

const settings = {
  show_tip: true,
  ignore_inactive: false,
  ignore_playlists: false,
  ignore_live: false,
  sort_sponsorblock: false,
  force_reload: false,
  sorting: [
    {
      dropdown: ["A-Z", "Z-A"],
      asc: false,
      order: 0,
      attr: "title",
      title: "Video Title",
    },
    {
      dropdown: ["Oldest first", "Newest first"],
      asc: false,
      order: 1,
      attr: "uploadDate",
      title: "Upload Date",
    },
    {
      dropdown: ["Least first", "Most first"],
      asc: false,
      order: 2,
      attr: "views",
      title: "Views",
    },
    {
      dropdown: ["A-Z", "Z-A"],
      asc: false,
      order: 3,
      attr: "author",
      title: "Channel Name",
    },
    {
      dropdown: ["Shortest first", "Longest first"],
      asc: false,
      order: 4,
      attr: "liveDuration",
      title: "Video Duration",
    },
  ],
  menu: 0,
};

function extractYouTubeID(url) {
  return regex.test(url) && regex.exec(url)[7];
}

/** renders the list of detected tabs. */
async function renderList() {
  const tabList = document.getElementById("video-list");
  tabList.innerHTML = "";

  const tabs = await prefilterTabs();
  updateStats(tabs);

  for (const tab of tabs) {
    const el = document.createElement("button");
    el.onclick = () => {
      browser.tabs.update(tab.id, { active: true });
    };
    el.id = tab.youtubeID;
    el.classList.add("item");

    const titleElement = document.createElement("p");
    titleElement.className = "title";
    titleElement.textContent = tab.title;
    el.appendChild(titleElement);

    const smallElement = document.createElement("small");
    const properties = [
      { prop: "live", textFunc: () => "Live", className: "badge" },
      { prop: "playlist", textFunc: () => "Playlist", className: "badge" },
      {
        prop: "duration",
        textFunc: (duration) =>
          tab.live > 0
            ? `Live in ${getPremiereTime(tab.live)}`
            : getDuration(duration),
      },
      {
        prop: "uploadDate",
        textFunc: (date) => new Date(date).toLocaleDateString(),
      },
      { prop: "views", textFunc: (views) => `${getViews(views)} Views` },
      { prop: "author" },
    ];
    properties.forEach(({ prop, textFunc, className }) => {
      if (tab[prop] || prop === "duration") {
        const spanElement = document.createElement("span");
        if (className) spanElement.className = className;
        if (settings.sort_sponsorblock && prop === "duration") {
          spanElement.textContent = textFunc(tab["skipped"] ?? tab["duration"]);
        } else {
          spanElement.textContent = textFunc ? textFunc(tab[prop]) : tab[prop];
        }
        smallElement.appendChild(spanElement);
      }
    });
    el.appendChild(smallElement);
    tabList.appendChild(el);
  }
}

/** changes the active menu in the settings and saves it */
async function setActiveMenu(menu) {
  settings.menu = menu;
  renderMenu();
  await updateSettings();
}

/** hides the list menu and shows the settings menu. */
function showSettings() {
  document.getElementById("tab-list").classList.add("hidden");
  document.getElementById("tab-settings").classList.remove("hidden");
  document.getElementById("tab-button-list").classList.remove("active");
  document.getElementById("tab-button-settings").classList.add("active");
}

/** hides the settings menu and shows the list menu. */
function showList() {
  document.getElementById("tab-settings").classList.add("hidden");
  document.getElementById("tab-list").classList.remove("hidden");
  document.getElementById("tab-button-settings").classList.remove("active");
  document.getElementById("tab-button-list").classList.add("active");
  renderList();
}

/** shows the correct menu, depending on the settings. */
function renderMenu() {
  if (settings.menu === 1) {
    showList();
  } else {
    showSettings();
  }
}

/** renders the sort options incl the buttons and dropdowns */
function renderSortOptions() {
  const container = document.getElementById("sortable-list");
  container.innerHTML = "";

  for (const sortRule of settings.sorting) {
    const dropdown = document.createElement("select");
    dropdown.addEventListener("click", (e) =>
      changeSortOrder(sortRule.attr, undefined, e),
    );

    const option1 = document.createElement("option");
    option1.value = "false";
    if (sortRule.asc !== true) {
      option1.selected = true;
    }
    option1.textContent = sortRule.dropdown[0];

    const option2 = document.createElement("option");
    option2.value = "true";
    if (sortRule.asc === true) {
      option2.selected = true;
    }
    option2.textContent = sortRule.dropdown[1];

    dropdown.appendChild(option1);
    dropdown.appendChild(option2);

    const buttonUp = document.createElement("button");
    buttonUp.classList.add("up");
    buttonUp.addEventListener("click", () =>
      changeSortOrder(sortRule.attr, false),
    );
    buttonUp.innerHTML =
      '<svg height="24" viewBox="0 0 24 24" width="24" transform="scale(1, -1)"><path d="m18 9.28-6.35 6.35-6.37-6.35.72-.71 5.64 5.65 5.65-5.65z"></path></svg>';

    const buttonDown = document.createElement("button");
    buttonDown.classList.add("down");
    buttonDown.addEventListener("click", () =>
      changeSortOrder(sortRule.attr, true),
    );
    buttonDown.innerHTML =
      '<svg height="24" viewBox="0 0 24 24" width="24"><path d="m18 9.28-6.35 6.35-6.37-6.35.72-.71 5.64 5.65 5.65-5.65z"></path></svg>';

    const buttons = document.createElement("div");
    buttons.classList.add("buttons");
    buttons.appendChild(dropdown);
    buttons.appendChild(buttonUp);
    buttons.appendChild(buttonDown);

    const el = document.createElement("li");
    el.id = sortRule.attr;
    el.classList.add("item");
    const spanElement = document.createElement("span");
    spanElement.className = "title";
    spanElement.textContent = sortRule.title;
    el.appendChild(spanElement);

    el.appendChild(buttons);
    container.appendChild(el);
  }
}

async function changeSortOrder(attr, down, e) {
  const index = settings.sorting.findIndex((item) => item.attr === attr);
  if (down === true)
    [settings.sorting[index], settings.sorting[index + 1]] = [
      settings.sorting[index + 1],
      settings.sorting[index],
    ];
  else if (down === false)
    [settings.sorting[index], settings.sorting[index - 1]] = [
      settings.sorting[index - 1],
      settings.sorting[index],
    ];
  if (e !== undefined) settings.sorting[index].asc = JSON.parse(e.target.value);
  renderSortOptions();
  await updateSettings();
}

async function renderSettings() {
  document.getElementById("ignore-inactive").checked = settings.ignore_inactive;
  document.getElementById("ignore-live").checked = settings.ignore_live;
  document.getElementById("ignore-playlists").checked =
    settings.ignore_playlists;
  document.getElementById("sort-sponsorblock").checked =
    settings.sort_sponsorblock;
  document.getElementById("force-reload").checked = settings.force_reload;
  const tabs = await prefilterTabs();
  if (tabs.some((tab) => tab.skipped)) {
    document.getElementById("sort-sponsorblock").parentNode.style.display =
      "intial";
  } else {
    document.getElementById("sort-sponsorblock").parentNode.style.display =
      "none";
  }
}

async function changeSetting(setting, e) {
  settings[setting] = e.target.checked === true ? true : false;
  renderSettings();
  await updateSettings();
}

async function closeTip(e) {
  settings.show_tip = false;
  document.getElementById("tips").classList.add("hidden");
  renderSettings();
  await updateSettings();
}

async function init() {
  await getSettings();

  // show the correct menu tab
  document
    .getElementById("tab-button-settings")
    .addEventListener("click", () => setActiveMenu(0));
  document
    .getElementById("tab-button-list")
    .addEventListener("click", () => setActiveMenu(1));
  renderMenu();

  // hide tips
  if (settings.show_tip !== true)
    document.getElementById("tips").classList.add("hidden");

  // update version
  document.getElementById("version-number").innerText =
    browser.runtime.getManifest().version || "Unknown";

  // render sort options and other settings
  renderSortOptions();
  await renderSettings();

  // set events
  document
    .getElementById("close-button")
    .addEventListener("click", (e) => closeTip(e));

  document
    .getElementById("ignore-inactive")
    .addEventListener("click", (e) => changeSetting("ignore_inactive", e));
  document
    .getElementById("ignore-live")
    .addEventListener("click", (e) => changeSetting("ignore_live", e));
  document
    .getElementById("ignore-playlists")
    .addEventListener("click", (e) => changeSetting("ignore_playlists", e));
  document
    .getElementById("sort-sponsorblock")
    .addEventListener("click", (e) => changeSetting("sort_sponsorblock", e));
  document
    .getElementById("force-reload")
    .addEventListener("click", (e) => changeSetting("force_reload", e));

  document
    .getElementById("delete-storage")
    .addEventListener("click", deleteStorage);
  document
    .getElementById("tab-button-sort")
    .addEventListener("click", sortTabs);
}

document.addEventListener("DOMContentLoaded", init);
