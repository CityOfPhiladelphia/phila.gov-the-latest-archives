<template>
  <div id="archives">
    <fieldset>
      <div class="search">
        <input
          id="search-bar"
          v-model="search"
          class="search-field"
          type="text"
          placeholder="Search by title, department, or keyword"
          @keyup.enter="searchFilter();"
        ><input
          ref="archive-search-bar"
          type="submit"
          class="search-submit"
          value="Search"
          @click="searchFilter();"
        >
      </div>
    </fieldset>
    <div
      id="filter-results"
      class="bg-ghost-gray pam"
    >
      <div class="h5">
        Filter results
      </div>
      <fieldset>
        <div class="grid-x grid-margin-x mbl">
          <div
            v-for="(value, key) in templatesList"
            :key="key"
            class="cell medium-auto filter-box"
          >
            <input
              :id="key"
              v-model="templates"
              type="checkbox"
              :value="key"
              :name="key"
            >
            <label
              :for="key"
              class="post-label"
              :class="'post-label--' + key"
            >{{ value }}</label>
          </div>
        </div>
      </fieldset>
      <div class="grid-x grid-margin-x">
        <div class="cell medium-4 small-10">
          <datepicker
            v-model="start"
            name="start"
            placeholder="Start date"
            format="MMM dd, yyyy"
            
            :disabled-dates="disabledStartDate"
            @closed="filterPosts()"
          />
        </div>
        <div class="cell medium-1 small-2 mts">
          <i class="fas fa-arrow-right" />
        </div>
        <div class="cell medium-4 small-10">
          <datepicker
            v-model="end"
            name="end"
            placeholder="End date"
            format="MMM dd, yyyy"
            :disabled-dates="disabledEndDate"
            
            @closed="filterPosts()"
          />
        </div>
        <div 
          id="lang-filter"
          class="cell medium-5 small-2 filter-by-owner"
        >
          <v-select
            ref="categorySelect"
            v-model="language"
            label="langName"
            placeholder="Language"
            :options="languages"
            @input="filterPosts()"
          />
        </div>
        <div 
          id="dept-filter"
          class="cell medium-5 small-24 auto filter-by-owner"
        >
          <v-select
            ref="categorySelect"
            v-model="department"
            label="slang_name"
            placeholder="All departments"
            :options="categories"
            @input="filterPosts()"
          />
        </div>
        <div class="cell medium-4 small-24">
          <a
            class="button content-type-featured full"
            @click="clearAllFilters()"
          >Clear filters</a>
        </div>
      </div>
    </div>

    <div
      v-show="loading"
      class="mtm center"
    >
      <i class="fas fa-spinner fa-spin fa-3x" />
    </div>
    <div
      v-show="!loading && emptyResponse"
      class="h3 mtm center"
    >
      Sorry, there are no results.
    </div>
    <div
      v-show="failure"
      class="h3 mtm center"
    >
      Sorry, there was a problem. Please try again.
    </div>

    <div
      v-if="filteredPosts.length"
      class="table-container"
    >
      <table
        v-show="!loading && !emptyResponse && !failure" 
        class="stack theme-light archive-results"
        data-sticky-container
      >
        <thead
          class="sticky center bg-white"
          data-sticky
          data-top-anchor="filter-results:bottom"
          data-btm-anchor="page:bottom"
          data-options="marginTop:4.8;"
        >
          <tr>
            <th
              class="table-sort title"
              :class="sortTitle"
              @click="sort('title')"
            >
              <span>Title</span>
            </th>
            <th
              class="table-sort date"
              :class="sortDate"
              @click="sort('date')"
            >
              <span>Publish date</span>
            </th>
            <th>Department</th>
            <th class="post-type">
              Type
            </th>
          </tr>
        </thead>
        <paginate
          name="filteredPosts"
          :list="filteredPosts"
          class="paginate-list"
          tag="tbody"
          :per="20"
        >
          <tr
            v-for="post in paginated('filteredPosts')"
            :key="post.id"
            class="vue-clickable-row"
            @click.stop.prevent="goToPost(post.link)"
          >
            <td class="title">
              <a
                :href="post.link"
                target="_blank"
                @click.prevent="goToPost(post.link)"
              >
                {{ post.title }}
              </a>
            </td>
            <td class="date">
              {{ post.date | formatDate }}
            </td>
            <td class="categories">
              <span
                v-for="(category, i) in post.categories"
                :key="i"
              >
                <span>{{ category.slang_name }}</span><span v-if="i < post.categories.length - 1">,&nbsp;</span>
              </span>
            </td>
            <td class="post-type">
              {{ post.template | formatTemplate }}
            </td>
          </tr>
        </paginate>
      </table>
      <paginate-links
        v-show="!loading && !emptyResponse && !failure"
        for="filteredPosts"
        :async="true"
        :limit="3"
        :show-step-links="true"
        :hide-single-page="false"
        :step-links="{
          next: 'Next',
          prev: 'Previous'
        }"
        @change="scrollToTop"
      />
    </div>
  </div> 
</template>
<script>

import Vue from "vue";
import axios from "axios";
import moment from "moment";
import vSelect from 'vue-select';
import VuePaginate from "vue-paginate";
import VueFuse from "vue-fuse";
import Datepicker from 'vuejs-datepicker';


Vue.use(VuePaginate);
Vue.use(VueFuse);

// const endpoint =
//   "https://cors-anywhere.herokuapp.com/phila.gov/wp-json/the-latest/v1/";

const endpoint = "https://api.phila.gov/phila/the-latest/v1/";

export default {
  name: "Archives",
  components: { 
    Datepicker, 
    vSelect,
  },
  filters: {
    'formatDate': function(value) {
      if (value) {
        return moment(String(value)).format('MMM DD, YYYY');
      }
    },
    'formatTemplate': function(value) {
      if (value === "action_guide") {
        return "Action Guide";
      } else if (value === "post") {
        return "Post";
      } else if (value === "featured") {
        return "Featured";
      } else if (value === "press_release") {
        return "Press Release";
      } else if (value === "news_post") {
        return "Post";
      }
    },
  },
  data: function() {
    return {
      posts: [],
      filteredPosts: [],
      
      templatePosts: [],
      datePosts: [],
      searchPosts: [],
      departmentPosts: [],
      tagPosts: [],
      langPosts: [],
      
      endpointCategories: [],
      endpointCategoriesSlang: [],
      
      paginate: [ "filteredPosts" ],
      loading: true,
      emptyResponse: false,
      failure: false,

      currentSort:'date',
      currentSortDir: 'desc',

      templates: [],
      categories: [],
      languages: [ 
        {
          langCode: "english",
          langName: "English",
        },
        {
          langCode: "spanish",
          langName: "Español",
        },
        {
          langCode: "chinese",
          langName: "中文",
        },
        {
          langCode: "vietnamese",
          langName: "Tiếng Việt",
        },
        {
          langCode: "russian",
          langName: "Pусский",
        },
        {
          langCode: "french",
          langName: "Français",
        },
        {
          langCode: "arabic",
          langName: "عربى",
        },
        {
          langCode: 'bengali',
          langName: 'বাংলা',
        },
        {
          langCode: 'burmese',
          langName: 'မြန်မာ',
        },
        {
          langCode: 'haitian',
          langName: 'Ayisyen',
        },
        {
          langCode: 'hindo',
          langName: 'Hindo',
        },
        {
          langCode: 'indonesian', 
          langName: 'Bahasa Indonesia',
        },
        {
          langCode: 'urdu', 
          langName: 'اردو',
        },
        {
          langCode: 'korean', 
          langName: '한국어',
        },
        {
          langCode: 'khmer', 
          langName: 'ខ្មែរ',
        },
        {
          langCode: 'portuguese', 
          langName: 'Português',
        },
        {
          langCode: 'swahili',
          langName: 'Kiswahili',
        },
      ],
      search: '',
      department: '',
      tag: '',
      start: '',
      end: '',
      language: '',
      
      searchOptions: {
        shouldSort: false, 
        threshold: 0.5, 
        keys: [
          'title',
          'categories.name',
          'tags.name',
        ],
      },
      tagOptions: {
        shouldSort: false,
        threshold: 0.0,
        keys: [
          'tags.name',
          'tags.slug',
        ],
      },
      templateOptions: {
        shouldSort: false,
        threshold: 0.0, 
        keys: [
          'template',
        ],
      },

      templatesList: {
        featured: "Featured",
        post: "Posts",
        action_guide: "Action guides",
        press_release: "Press releases",
      },

      

      disabledStartDate: {
        from: new Date(Date.now()),
        to: new Date(2015, 6, 25),
      },

      routerQuery: {},
    };
  },
  computed: { 
    sortTitle: function(){
      if (this.currentSort == 'title') {
        return this.currentSortDir;
      } 
      return "";
      
    },
    sortDate: function(){
      if (this.currentSort == 'date'){
        return this.currentSortDir;
      } 
      return "";
    },

    disabledEndDate: function(){
      if (this.start == '')  {
        return this.disabledStartDate;
      } else if (this.start) {
        return {
          to: new Date(this.start),
          from: new Date(Date.now()),
        };
      } 
      return this.disabledStartDate;
    },
  },

  watch: {
    department (value) {
      this.updateRouterQuery('department', value);
    },

    templates (value) {
      this.filterPosts();
      this.updateRouterQuery('templates', value);
    },

    start (value) {
      if (value) {
        this.updateRouterQuery('start',  moment(value).unix());
      }
    },

    end (value) {
      if (value) {
        this.updateRouterQuery('end', moment(value).unix());
        this.disabledStartDate.from = value;
      } else {
        this.disabledStartDate.from = new Date(Date.now());
        this.disabledEndDate.from = new Date(Date.now());
      }        
     
    },

    language (value) {
      if (value) {
        this.updateRouterQuery('language', value.langCode);
      }       
     
    },

    routerQuery: {
      handler: function () {
        this.updateRouter();
      },
      deep: true,
    },

  },

  created:  function() {
    this.getAllPosts();
    this.getAllCategories();
  },

  methods: {
    /**
    * @desc fetches all archives posts from endpoint & calls filter posts to 
    */
    getAllPosts: function() {
      {
        axios
          .get(endpoint + "archives", {
            params: {
              count: -1,
            },
          })
          .then(response => {
            this.posts = response.data;
            this.getDropdownCategories();
            this.initFilters();
            this.filterPosts();
            this.loading = false;
          })
          .catch(e => {
            window.console.log(e);
            this.failure = true;
            this.loading = false;
          });
      }
    },

    /**
    * @desc fetches all the departments from the categories endpoint
    */
    getAllCategories: function() {
      {
        axios
          .get(endpoint + "categories")
          .then(response => {
            this.endpointCategories = response.data;
          })
          .catch (e => {
            window.console.log(e);
            this.endpointCategories = [];
          });
      }
    },

    /**
    * @desc makes a list of all the departments from the fetched posts, and compares them to the
    * ones from the endpoint. if the department is in both arrays, it will add it to the categories array
    */
    getDropdownCategories: function () {
      this.posts.forEach((post) => {
        post.categories.forEach((category) => {
          let newCategory = category.slang_name;
          if (newCategory !== '') {
            this.categories.push(newCategory);
          }
        });
      });
      this.categories = this.categories.filter((item, index) => this.categories.indexOf(item) === index);
      this.endpointCategories.forEach((category) => {
        this.endpointCategoriesSlang.push(category.slang_name);
      });
      this.categories = this.categories.filter((category) => this.endpointCategoriesSlang.includes(category)).sort();
    },
  

    filterByTag: function () {
      if (this.tag !== '') { // there is nothing in the tag URL
        this.langPosts = [];
        this.$search(this.tag, this.tagPosts, this.tagOptions).then(posts => {
          this.langPosts = posts;
        });
      } else {
        this.langPosts = this.tagPosts;
      }
    },

    filterByLanguage: function() {
      if (this.language) {
        this.filteredPosts = [];
        // let selectedLang = this.languages.filter(langObj => {
        //   return langObj.langName == this.langauge; 
        // });

        // console.log(selectedLang);
        this.filteredPosts = this.langPosts.filter(post => {
          return post.language == this.language.langCode;
        });
        
      } else {
        this.filteredPosts = this.langPosts;
      }

    },

    checkEmpty: function() {
      if (this.filteredPosts.length === 0) {
        this.emptyResponse = true;
      } else {
        this.emptyResponse = false;
      } 
    },

    filterByDate: function () {
      if ((this.start !== '' ) && (this.end !== '')) {
        let queryStart = moment(this.start.setHours(0,0,0,0)).unix(); //convert to 12:00AM of the start date
        let queryEnd = moment(this.end.setHours(23,59,59,0)).unix(); //convert to 11:59pm of the end date

        if (queryEnd < queryStart) {
          this.failure = true;
          this.filteredPosts = [];
        } else {
          this.failure = false;
          this.datePosts = [];
          this.searchPosts.forEach((post) => {
            let postDate = moment(post.date).unix();
            if ((postDate >= queryStart) && (postDate <= queryEnd )) {
              this.datePosts.push(post);
            }
          });
          this.tagPosts = this.datePosts;
        }
      } else {
        this.tagPosts = this.searchPosts;
      }
    },

    filterBySearch: function() {
      if (this.search !== '') { // there is nothing in the search bar -> return everything in filteredPosts
        this.searchPosts = [];
        this.$search(this.search, this.templatePosts, this.searchOptions).then(posts => {
          this.searchPosts = posts;
        });
      } else {
        this.searchPosts = this.templatePosts;
      }
    },

    filterByDepartment: function() {
      if (this.department !== '' && this.department !== null) { 
        this.departmentPosts = this.posts.filter(post => {
          return post.categories.find(category => {
            if(category.slang_name === this.department) {
              return true;
            }
          });
        });
      } else {
        this.departmentPosts = this.posts;
      }  
    },

    filterByTemplate: function() {
      if (this.templates.length !== 0) {
        this.templatePosts = [];
        this.departmentPosts.forEach((post) => {
          if (this.templates.includes(post.template)) {
            this.templatePosts.push(post);
          }
        });
      } else {
        this.templatePosts = this.departmentPosts;
      } 
    },
    
    /**
    * @desc calls all the filter helper functions in order
    */
    filterPosts: async function () {
      await this.filterByDepartment();
      await this.filterByTemplate();
      await this.filterBySearch();
      await this.filterByDate();
      await this.filterByTag();
      await this.filterByLanguage();
      await this.checkEmpty();
    },

    /**
    * @desc need to use this to filter from searches in order to update the router query at the same time
    */
    searchFilter: async function() {
      await this.filterPosts();
      await this.updateRouterQuery('search', this.search);
    },
    
    /**
    * @desc resets all the data that is associated with filtering posts, displaying all posts from endpoint
    */
    clearAllFilters: function () {
      this.search = '';
      this.templates = [];
      this.start = '';
      this.end = '';
      this.department = '';
      this.tag = '';
      this.language = '';
      this.resetRouterQuery();
      this.filteredPosts = this.posts;
      this.currentSort = 'date';
      this.currentSortDir = 'desc';
      this.sortPosts();
      this.failure = false;
      this.checkEmpty();
    },

    goToPost: function(link) {
      window.location.href = link;
    },

    sort: function(column) {
      //if column == current sort, reverse
      if(column === this.currentSort) {
        this.currentSortDir = this.currentSortDir === 'asc' ? 'desc' : 'asc';
      }
      this.currentSort = column;
      this.sortPosts();
    },

    sortPosts: function() {
      this.filteredPosts = this.filteredPosts.sort((a,b) => {
        let modifier = 1;
        if(this.currentSortDir === 'desc') {
          modifier = -1;
        }
        if(a[this.currentSort] < b[this.currentSort]) {
          return -1 * modifier;
        }
        if(a[this.currentSort] > b[this.currentSort]) {
          return 1 * modifier;
        }
        return 0;
      });
    },

    /**
    * @desc fetches all query params from the route and inputs it into the data of app
    */
    initFilters: function() {
      if (Object.keys(this.$route.query).length !== 0) {
        for (let routerKey in this.$route.query) {
          if(routerKey === "templates"){
            Vue.set(this, routerKey, this.returnArray(this.$route.query[routerKey]));
          } else if (routerKey === "start" || routerKey === "end"){ 
            let unixValue = this.$route.query[routerKey];
            if (!isNaN(unixValue)) {
              unixValue = new Date(unixValue * 1000);
              Vue.set(this, routerKey, unixValue);
            }
          } else if (routerKey == "language") {

            let setLang = this.languages.filter(langObj => {
              return langObj.langCode == this.$route.query[routerKey]; 
            });
            console.log(setLang[0]);
            this.language = setLang[0];

            // Vue.set(this, routerKey, this.$route.query[routerKey]);
          } else {
            Vue.set(this, routerKey, this.$route.query[routerKey]);
          }
        }
      }
    },

    returnArray (value) {
      if (Array.isArray(value)) {
        return value;
      } 
      if (value !== '') {
        return [ value ];
      } 
      return [];
    },

    updateRouterQuery: function (key, value) {
      if (typeof value === 'undefined' || value === '' || value === null) {
        Vue.delete(this.routerQuery, key);
      } else {
        Vue.set(this.routerQuery, key, value);
      }
    },

    /**
    * @desc scrolls to top from paginate buttons
    */
    scrollToTop : function () {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    },

    resetRouterQuery: function () {
      for (let routeKey in this.$route.query) {
        Vue.delete(this.routerQuery, routeKey);
      }
    },

    updateRouter: function () {
      if (this.routerQuery  === this.$route.query) {
        return;
      } 
      this.$router.push({
        name: 'main',
        query: this.routerQuery,
      }).catch(e => {
        window.console.log(e);
      });
    },
  },
};
</script>

<style lang="scss">

@import 'node_modules/vue-select/dist/vue-select';

.search, .pam, .table-container {
  width: 75%;
  margin: 0 auto;
  max-width: 1000px;
}

.post-title {
  text-align: center;
  display: block;
  margin: 0 auto;
}

.paginate-links {
  float: right;
}

.post-label, .table-sort {
  user-select: none;
}

tr td:first-child {
  min-width: 50%;
}

tr td:last-child {
  max-width: 30%;
}

.filter-by-owner{
  font-family:"Open Sans", Helvetica, Roboto, Arial, sans-serif !important;
}
.filter-by-owner .v-select .vs__dropdown-toggle {
  border:none;
  background:white;
}
.filter-by-owner .v-select .vs__open-indicator path{
  bottom:0;
  top:0;
  right:0;
  background: #0f4d90;
  padding: 0 0 0 9px;
  width: 30px;
  height:100%;
  fill: #0f4d90;
}

.v-select .vs__actions{
  padding:0 5px 0 0;
}

.v-select .vs__search {
 color: #a1a1a1;
 background: white;
}

.vs__selected {
  position: absolute;
  z-index: 10;
}
.vs__clear:hover {
  background-color: transparent;
}

.v-select .vs__dropdown-toggle{
  border-radius: 0;
  padding:0;
}

.v-select .vs__dropdown-toggle{
  border-radius: 0;
  padding:0;
}

#dept-filter .v-select .vs__dropdown-menu{
 width: 400px;
}

.filter-by-owner .v-select input[type=search],
.v-select input[type=search]:focus{
  border:none;
}
.filter-by-owner .v-select .vs__open-indicator{
  border-color:white;
  cursor: pointer;
}
.filter-by-owner .v-select input[type=search],
.filter-by-owner .v-select input[type=search]:focus {
  height: 2.4rem;
  margin:0;
}
.filter-by-owner ul.vs__dropdown-menu{
  border:none;
  font-weight: bold;
  overflow-x: hidden;
}
.filter-by-owner ul.vs__dropdown-menu li{
  border-bottom: 1px solid #f0f0f0;
  padding: 15px 0 15px 10px;
}

.vdp-datepicker [type='text'] {
  height: 2.4rem;
}
.vdp-datepicker input:read-only{
  background: white;
  cursor: pointer;
}
.vdp-datepicker__calendar span.prev.disabled {
    display: inline-block !important;
  }

  .vdp-datepicker__calendar span.next.disabled {
    display: inline-block !important;
  }
#archive-results .vdp-datepicker__calendar .cell.selected,
#archive-results .vdp-datepicker__calendar .cell.selected.highlighted,
#archive-results .vdp-datepicker__calendar .cell.selected:hover {
  background: #25cef7;
}

.vs__dropdown-option--highlight.vs__dropdown-option{
  background: #0f4d90;
  color: white;
}

@media screen and (max-width: 750px) {
  .search, .pam, .table-container {
    width: 96%;
  }
  .post-type {
    display: none;
  }

  .cell.medium-auto.filter-box {
    width: 40%;
  }

  .filter-by-owner {
    width: 90% !important;
  }
}

</style>