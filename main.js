class SearchComp {
  constructor() {
    this.apikey = "4597190b0abd5fed73f4b45ff2b05a5c";
    this.baseUrl = "https://api.themoviedb.org/3";

    this.cache = new Map();
    this.debounceTimer = null;

    this.app = document.getElementById("app");
    this.input = document.getElementById("search-input");
    this.resultsCont = document.getElementById("results");

    this.init();
  }

  init() {
    this.input.addEventListener("input", (e) => {
      this.handleInput(e.target.value);
    });
  }

  handleInput(value) {
    this.debounceSearch(value);
  }

  debounceSearch(value) {
    clearTimeout(this.debounceTimer); //clear the timer

    // set new timer
    this.debounceTimer = setTimeout(() => {
      this.searchMovies(value);
    }, 300); // 300 (wait this time before firing api call)
  }

  searchMovies(query) {
    if (!query.trim()) {
      // no query then just return
      this.resultsCont.textContent = "";
      return;
    }

    const queryLowerCase = query.toLowerCase().trim();

    // must check cache first
    if (this.cache.has(queryLowerCase)) {
      console.log("cache has it hehe");
      this.renderResults(this.cache.get(queryLowerCase));
      return;
    }

    //abort Controller
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const currentController = this.abortController;

    this.setLoading(true);

    this.fetchMovies(queryLowerCase, this.abortController.signal)
      .then((data) => {
        this.cache.set(queryLowerCase, data.results);
        this.renderResults(data.results);
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          console.log("Request Cancelled");
        } else {
          console.error(error);
        }
      })
      .finally(() => {
        if (this.abortController === currentController) {
          this.setLoading(false);
        }
      });
  }

  fetchMovies(query, signal) {
    const url = `${this.baseUrl}/search/movie?api_key=${this.apikey}&query=${encodeURIComponent(query)}`;

    return fetch(url, { signal }).then((response) => {
      if (!response.ok) {
        throw new Error("Api failed");
      }
      return response.json();
    });
  }

  renderResults(movies) {
    this.resultsCont.innerHTML = ""; // here were clearing the container content, so we can utilize innerHTML

    const template = document.getElementById("movie-template");
    const fragment = new DocumentFragment();

    movies.forEach((movie) => {
      const clone = template.content.cloneNode(true); //cloned template for each movie

      const titleEl = clone.querySelector(".title"); // title
      const imgEl = clone.querySelector(".poster"); // image

      titleEl.textContent = movie.title;

      // Add image logic
      if (imgEl) {
        if (movie.poster_path) {
          imgEl.src = `https://image.tmdb.org/t/p/w200${movie.poster_path}`;
          imgEl.alt = movie.title;
        } else {
          imgEl.src = "https://via.placeholder.com/50x75?text=No+Image";
        }
      }

      clone.querySelector(".movie-item").addEventListener("click", () => {
        this.handleMovieSelection(movie.id);
      });

      fragment.appendChild(clone); // cloned template is append to a document fragment
    });
    this.resultsCont.appendChild(fragment); //document fragment is appended to the DOM in one operation
  } //this improves rendering performance rather than rendering multiple reflows

  handleMovieSelection(movieId) {
    console.log("Selected movie:", movieId);
    this.fetchMovieInfo(movieId);
  }

  fetchMovieInfo(movieId) {
    const detailsUrl = `${this.baseUrl}/movie/${movieId}?api_key=${this.apikey}`;
    const creditUrl = `${this.baseUrl}/movie/${movieId}/credits?api_key=${this.apikey}`;
    const videoUrl = `${this.baseUrl}/movie/${movieId}/videos?api_key=${this.apikey}`;

    Promise.allSettled([
      // utilize allSettled so that even if one of these fetches fail we can still move forward
      //if promise.all was utilized then if one failed everything would fail and break.
      fetch(detailsUrl).then((response) => {
        // ***
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
      }), // concurrent data fetching here.
    ]).then((results) => {
      const [details, credits, videos] = results; //store results in array.

      if (details.status === "fulfilled") {
        //check if the promise state is fulfilled
        this.renderDetails(details.value);
      } else {
        console.error("Details did not pass");
      }

      if (credits.status === "fulfilled") {
        //check if the promise state is fulfilled
        this.renderCredits(credits.value);
      } else {
        console.error("Credits did not pass");
      }

      if (videos.status === "fulfilled") {
        //check if the promise state is fulfilled
        this.renderVideo(videos.value);
      } else {
        console.error("Videos did not pass");
      }
    });
  }

  // rendering functions
  renderDetails(data) {
    console.log("Details:", data);
  }

  renderCredits(data) {
    console.log("Credits:", data);
  }

  renderVideo(data) {
    console.log("Video:", data);
  }

  setLoading(isLoading) {
    this.app.setAttribute("data-loading", isLoading);
  }
}

new SearchComp();
