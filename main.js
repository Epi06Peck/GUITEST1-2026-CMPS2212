function createSearchApp() {
  const apikey = "4597190b0abd5fed73f4b45ff2b05a5c";
  const baseUrl = "https://api.themoviedb.org/3";

  //  STATE
  const cache = new Map();
  let debounceTimer = null;
  let abortController = null;
  let selectedIndex = -1;
  let currentResults = [];
  let currentQuery = "";

  const app = document.getElementById("app");
  const input = document.getElementById("search-input");
  const resultsCont = document.getElementById("results");

  // INIT
  function init() {
    input.addEventListener("input", (e) => {
      handleInput(e.target.value);
    });
    document.addEventListener("keydown", handleKeyDown);
  }

  // keydown function ---
  function handleKeyDown(e) {
    const items = resultsCont.querySelectorAll(".movie-item");

    if (!items.length) return;

    if (e.key === "ArrowDown") {
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      updateSelection(items);
    }

    if (e.key === "ArrowUp") {
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection(items);
    }

    if (e.key === "Enter" && selectedIndex >= 0) {
      items[selectedIndex].click();
    }
  } // keydown function --- end

  // helper function to update selection from what keydown value was pressed
  function updateSelection(items) {
    items.forEach((item, index) => {
      item.classList.toggle("active", index === selectedIndex);
    });
  }

  // safe highlighting
  function buildHighlightedTitle(title, query) {
    const container = document.createElement("span");

    const idx = title.toLowerCase().indexOf(query.toLowerCase());

    if (idx === -1) {
      container.textContent = title;
      return container;
    }

    const before = document.createTextNode(title.slice(0, idx));
    const match = document.createElement("span");
    const after = document.createTextNode(title.slice(idx + query.length));

    match.className = "highlight";
    match.textContent = title.slice(idx, idx + query.length);

    container.appendChild(before);
    container.appendChild(match);
    container.appendChild(after);

    return container;
  }

  function handleInput(value) {
    debounceSearch(value);
  }

  function debounceSearch(value) {
    clearTimeout(debounceTimer); //clear the timer
    //set new timer
    debounceTimer = setTimeout(() => {
      searchMovies(value);
    }, 300); // 300 (wait this time before firing api call)
  }

  //function searchmovies ----
  function searchMovies(query) {
    if (!query.trim()) {
      //no query then just return
      resultsCont.textContent = "";
      setLoading(false);
      return;
    }

    const queryLowerCase = query.toLowerCase().trim();
    currentQuery = queryLowerCase; // keep track of the current query
    selectedIndex = -1;

    // CACHE CHECK - MUST CHECK CACHE FIRST
    if (cache.has(queryLowerCase)) {
      console.log("cache has it hehe");
      const cached = cache.get(queryLowerCase);
      currentResults = cached;
      renderResults(cached);
      return;
    }

    // ABORT CONTROLLER
    if (abortController) {
      abortController.abort();
    }

    abortController = new AbortController();
    const currentController = abortController;

    setLoading(true);

    fetchMovies(queryLowerCase, abortController.signal)
      .then((data) => {
        cache.set(queryLowerCase, data.results);
        renderResults(data.results);
        currentResults = data.results;
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          console.log("Request Cancelled");
        } else {
          console.error(error);
        }
      })
      .finally(() => {
        if (abortController === currentController) {
          setLoading(false);
        }
      });
  } //function searchmovies ----end

  //function fethmovies ---
  function fetchMovies(query, signal) {
    const url = `${baseUrl}/search/movie?api_key=${apikey}&query=${encodeURIComponent(query)}`;

    return fetch(url, { signal }).then((response) => {
      if (!response.ok) {
        throw new Error("Api failed");
      }
      return response.json();
    });
  }

  function renderResults(movies) {
    selectedIndex = -1; // resets selection when new results render
    resultsCont.innerHTML = ""; // here were clearing the container content,
    //  so we can utilize innerHTML

    const template = document.getElementById("movie-template");
    const fragment = new DocumentFragment();

    movies.forEach((movie) => {
      const clone = template.content.cloneNode(true);

      const titleEl = clone.querySelector(".title"); //the title
      const imgEl = clone.querySelector(".poster"); // the image/poster

      const highlighted = buildHighlightedTitle(movie.title, currentQuery);
      titleEl.appendChild(highlighted);
      //THE IMAGE LOGIC
      if (imgEl) {
        if (movie.poster_path) {
          imgEl.src = `https://image.tmdb.org/t/p/w200${movie.poster_path}`;
          imgEl.alt = movie.title;
        } else {
          imgEl.src = "https://via.placeholder.com/50x75?text=No+Image";
        }
      }

      clone.querySelector(".movie-item").addEventListener("click", () => {
        handleMovieSelection(movie.id);
      });

      fragment.appendChild(clone);
    });

    resultsCont.appendChild(fragment);
  } //function fethmovies --- end

  function handleMovieSelection(movieId) {
    resultsCont.innerHTML = "";
    console.log("Selected movie:", movieId);
    fetchMovieInfo(movieId);
  }

  // function fetchmovie info ---
  function fetchMovieInfo(movieId) {
    setLoading(false);

    const detailsUrl = `${baseUrl}/movie/${movieId}?api_key=${apikey}`;
    const creditUrl = `${baseUrl}/movie/${movieId}/credits?api_key=${apikey}`;
    const videoUrl = `${baseUrl}/movie/${movieId}/videos?api_key=${apikey}`;

    Promise.allSettled([
      // utilize allSettled so that even if one of these fetches fail we can still move forward
      //if promise.all was utilized then if one failed everything would fail and break.
      fetch(detailsUrl).then((response) => {
        if (!response.ok) {
          throw new Error("Details failed");
        }
        return response.json();
      }),
      fetch(creditUrl).then((response) => {
        if (!response.ok) {
          throw new Error("Credits failed");
        }
        return response.json();
      }),
      fetch(videoUrl).then((response) => {
        if (!response.ok) {
          throw new Error("Videos failed");
        }
        return response.json();
      }),
    ])
      .then((results) => {
        const [details, credits, videos] = results; //store results in array.

        if (details.status === "fulfilled") {
          //check if the promise state is fulfilled
          renderDetails(details.value);
        } else {
          console.error("Details did not pass");
        }

        if (credits.status === "fulfilled") {
          //check if the promise state is fulfilled

          renderCredits(credits.value);
        } else {
          console.error("Credits did not pass");
        }

        if (videos.status === "fulfilled") {
          //check if the promise state is fulfilled
          renderVideo(videos.value);
        } else {
          console.error("Videos did not pass");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  } // function fetchmovie info --- end

  // RENDER FUNCTIONS
  function renderDetails(data) {
    const container = document.createElement("div");

    const title = document.createElement("h2");
    title.textContent = data.title;

    const overview = document.createElement("p");
    overview.textContent = data.overview;

    container.appendChild(title);
    container.appendChild(overview);

    resultsCont.appendChild(container);
  }

  function renderCredits(data) {
    const castTitle = document.createElement("h3");
    castTitle.textContent = "Top Cast";

    const list = document.createElement("ul");

    data.cast.slice(0, 5).forEach((actor) => {
      const li = document.createElement("li");
      li.textContent = actor.name;
      list.appendChild(li);
    });

    resultsCont.appendChild(castTitle);
    resultsCont.appendChild(list);
  }

  function renderVideo(data) {
    const videoTitle = document.createElement("h3");
    videoTitle.textContent = "Trailer";

    const vid = data.results.find((v) => v.type === "Trailer");

    if (vid) {
      const iframe = document.createElement("iframe");

      iframe.width = "560";
      iframe.height = "315";
      iframe.src = `https://www.youtube.com/embed/${vid.key}`;
      iframe.title = "YouTube video player";
      iframe.frameBorder = "0";

      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";

      iframe.allowFullscreen = true;

      resultsCont.appendChild(videoTitle);
      resultsCont.appendChild(iframe);
    } else {
      const noVid = document.createElement("p");
      noVid.textContent = "No trailer available";

      resultsCont.appendChild(videoTitle);
      resultsCont.appendChild(noVid);
    }
  }

  function setLoading(isLoading) {
    app.setAttribute("data-loading", isLoading);
  }

  init();
}

// START
createSearchApp();
