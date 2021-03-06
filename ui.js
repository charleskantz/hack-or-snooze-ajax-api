$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navLoggedIn = $("#nav-logged-in");
  const $navSubmit = $("#nav-submit");
  const $favoritedList = $("#favorited-articles");
  const $allArticles = $(".articles-container");


  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event Handler for revealing new story form
   */
  // $navSubmit.on("click", function(evt) {
  //   evt.preventDefault();
  //   $submitForm.slideToggle();
  // });

  $navLoggedIn.on("click", async function(evt) {
    evt.preventDefault();
    console.log('nav click');
    if( evt.target.id === "nav-submit" ) {
      console.log("submit clicked")
      $submitForm.slideToggle();
    }
    else if ( evt.target.id === "nav-favorites" ) {
      console.log('favorite click');
      $allStoriesList.empty();
      $favoritedList.show();
      const favoriteList = await StoryList.getStories(currentUser);
      // console.log(favoriteList);

      for (let story of favoriteList.stories) {
        const result = generateStoryHTML(story);
        $favoritedList.append(result);
      }
    }
  })

  /**
   * Event Handler for submitting a new story
   */

   $submitForm.on("submit", async function(evt){
    evt.preventDefault();

    // grab the required fields
    let author = $("#author").val();
    let title = $("#title").val();
    let url = $("#url").val();

    // take values and create story obj for addStory
    let requestStoryObj = {
      author,
      title,
      url
    }
    // call the addStory method, which calls the API and then builds a new story
    const story = await StoryList.addStory(currentUser, requestStoryObj);
    // console.log(story);

    // prepend new story to DOM
    let readyStory = generateStoryHTML(story);
    $allStoriesList.prepend(readyStory);
   })

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * Event handler for adding a favorite story                         --------------------- FAVORITES
   */

   $($allArticles).on("click", ".star", async function() {
     // identify storyId on applicable story to favorite
     let storyId = event.target.parentElement.id;
     let $favStar = $(event.target);
    //  console.log(favStarClass);

     // call addFavoriteStory method which call the API and adds story as a favorite
    //  let addedFavorite = await User.addFavoriteStory(currentUser, storyId);

      // TODO: make star state toggle function

      if (checkFavoriteStories(storyId)) {
        // change star, DELETE request to remove favorite
        $favStar.removeClass("fas fa-star star").addClass("far fa-star star");
        console.log("in if statement ", event.target.className);
        let something = await User.removeFavoriteStory(currentUser, storyId);
        console.log(something);
      }
      else {
        // change star, POST request to add favorite
        console.log("in else statement ", event.target.className);
        $favStar.removeClass("far fa-star star").addClass("fas fa-star star");
        await User.addFavoriteStory(currentUser, storyId);
      }
  });

   /**
    * Check currentUser favorites -
    * will check if a clicked story is already favorited
    */

    function checkFavoriteStories(storyId) {
      for (let i = 0; i < currentUser.favorites.length; i++) {
        let existingFav = currentUser.favorites[i];

        if (existingFav.storyId === storyId) {
          return  true;
        }
      }
      return false;
    }

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let favStarClass = "far fa-star star";

    // assigns favorite filled in star icon if story exists in currentUsers favorites array
    if(currentUser) {
      for (let i = 0; i < currentUser.favorites.length; i++) {
        let currentFav = currentUser.favorites[i];

        if (currentFav.storyId === story.storyId) {
          favStarClass = "fas fa-star star";
        }
        else {
          favStarClass = "far fa-star star";
        }
      }
    }

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <i class="${favStarClass}"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navLoggedIn.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
