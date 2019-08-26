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
            v-for="(value, key) in templates"
            :key="key"
            class="cell medium-auto"
          >
            <input
              :id="key"
              v-model="postTypes"
              type="checkbox"
              :value="key"
              :name="key"
              @click="amendPostTypeList(key)"
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
        <div class="cell medium-4 small-11">
          <datepicker
            v-model="startDate"
            name="startDate"
            placeholder="Start date"
            format="MMM. dd, yyyy"
            @closed="filterPosts()"
          />
        </div>
        <div class="cell medium-1 small-2 mts">
          <i class="fas fa-arrow-right" />
        </div>
        <div class="cell medium-4 small-11">
          <datepicker
            v-model="endDate"
            name="endDate"
            placeholder="End date"
            format="MMM. dd, yyyy"
            @closed="filterPosts()"
          />
        </div>
        <div class="cell medium-11 small-24 auto filter-by-owner">
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
              Post Type
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
          next: 'Older',
          prev: 'Newer'
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
import 'vue-select/dist/vue-select.css';

Vue.use(VuePaginate);
Vue.use(VueFuse);

const endpoint =
  "https://cors-anywhere.herokuapp.com/phila.gov/wp-json/the-latest/v1/";

export default {
  name: "Archives",
  components: { 
    Datepicker, 
    vSelect,
  },
  filters: {
    'formatDate': function(value) {
      if (value) {
        return moment(String(value)).format('MMM. DD, YYYY');
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
      }
    },
  },
  data: function() {
    return {
      posts: [],
      filteredPosts: [],
      templatePosts: [],
      datedPosts: [],
      searchPosts: [],
      categoryPosts: [],
      tagPosts: [],
      
      endpointCategories: [],
      endpointCategoriesSlang: [],
      
      paginate: [ "filteredPosts" ],
      loading: true,
      emptyResponse: false,
      failure: false,

      currentSort:'date',
      currentSortDir: 'desc',

      postTypes: [],
      categories: [],
      search: '',
      department: '',
      tag: '',
      startDate: '',
      endDate: '',
      
      searchOptions: {
        shouldSort: false, 
        threshold: 0.4, 
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
      categoryOptions: {
        shouldSort: false,
        threshold: 0.0,
        location: 0,
        maxPatternLength: 200,
        keys: [
          'categories.slang_name',
        ],
      },

      templates: {
        featured: "Featured",
        post: "Posts",
        action_guide: "Action guides",
        press_release: "Press releases",
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

  },

  watch: {

    department (value) {
      this.updateRouterQuery('department', value);
    },

    postTypes (value) {
      this.updateRouterQuery('postTypes', value);
    },

    startDate (value) {
      if (value) {
        this.updateRouterQuery('startDate',  moment(value).unix());
      }
    },

    endDate (value) {
      if (value) {
        this.updateRouterQuery('endDate', moment(value).unix());
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
            this.failure = true;
            this.loading = false;
          });
      }
    },

    getAllCategories: function() {
      {
        axios
          .get(endpoint + "categories")
          .then(response => {
            this.endpointCategories = response.data;
          })
          .catch (e => {
            this.endpointCategories = [];
          });
      }
    },

    getDropdownCategories: function () {
      this.posts.forEach((post) => {
        post.categories.forEach((category) => {
          let newCategory = category.slang_name;
          if (newCategory !== '') {
            this.categories.push(newCategory);
          }
        });
      });
      //filter out duplicates
      this.categories = this.categories.filter((item, index) => this.categories.indexOf(item) === index);
      //make array of endpoint array slang names  
      this.endpointCategories.forEach((category) => {
        let categoryName = category.slang_name;
        this.endpointCategoriesSlang.push(categoryName);
      });
      //compare both arrays and only return categories in both
      this.categories = this.categories.filter((category) => this.endpointCategoriesSlang.includes(category)).sort();

    },

    filterByTag: function () {
      if (this.tag !== '') { // there is nothing in the tag URL
        this.filteredPosts = [];
        this.$search(this.tag, this.tagPosts, this.tagOptions).then(posts => {
          this.filteredPosts = posts;
        });
      } else {
        this.filteredPosts = this.tagPosts;
      }
    },

    filterByDate: function () {
      if ((this.startDate !== '' ) && (this.endDate !== '')) {
        let start = moment(this.startDate.setHours(0,0,0,0)).unix(); //convert to 12AM of the start date
        let end = moment(this.endDate.setHours(23,59,59,0)).unix(); //convert to 11:59pm of the end date

        if (end < start) {
          this.failure = true;
          this.filteredPosts = [];
        } else {
          this.failure = false;
          this.datedPosts = [];
          this.searchPosts.forEach((post) => {
            let postDate = moment(post.date).unix();
            if ((postDate >= start) && (postDate <= end )) {
              this.datedPosts.push(post);
            }
          });
          this.tagPosts = this.datedPosts;
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
        this.$search(this.department, this.posts, this.categoryOptions).then(posts => {
          this.categoryPosts = posts;
        });
      } else {
        this.categoryPosts = this.posts;
      }  
    },

    filterByPostType: function() {
      if (this.postTypes.length !== 0) {
        this.templatePosts = [];
        this.categoryPosts.forEach((post) => {
          let postType = post.template;
          if (this.postTypes.includes(postType)) {
            this.templatePosts.push(post);
          }
        });
      } else {
        this.templatePosts = this.categoryPosts;
      } 
    },

    amendPostTypeList: function (postValue) {
      if (!this.postTypes.includes(postValue)) {  // && postValue === one of the keys in templates (need to error check against injected values)? 
        this.postTypes.push(postValue);
      } else if (this.postTypes.includes(postValue)) {
        this.postTypes = this.postTypes.filter(item => item !== postValue); 
      }
      this.filterPosts();
    },

    filterPosts: async function () {
      await this.filterByDepartment();
      await this.filterByPostType();
      await this.filterBySearch();
      await this.filterByDate();
      await this.filterByTag();
    },

    searchFilter: async function() {
      await this.filterPosts();
      await this.updateRouterQuery('search', this.search);
    },

    clearAllFilters: function () {
      this.search = '';
      this.postTypes = [];
      this.startDate = '';
      this.endDate = '';
      this.department = '';
      this.tag = '';
      this.resetRouterQuery();
      this.filteredPosts = this.posts;
      this.currentSort = 'date';
      this.currentSortDir = 'desc';
      this.sortPosts();
      this.failure = false;
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

    initFilters: function() {
      if (Object.keys(this.$route.query).length !== 0) {
        for (let key in this.$route.query) {
          if(key === "postTypes"){
            Vue.set(this, key, this.returnArray(this.$route.query[key]));
          } else if (key === "startDate" || key === "endDate"){  
            let value = this.$route.query[key];
            value = new Date(value * 1000);
            Vue.set(this, key, value);
          } else {
            Vue.set(this, key, this.$route.query[key]);
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

    scrollToTop : function () {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    },

    resetRouterQuery: function () {
      for (let key in this.$route.query) {
        Vue.delete(this.routerQuery, key);
      }
    },

    updateRouter: function () {
      if (this.routerQuery  === this.$route.query) {
        return;
      } 
      this.$router.push({
        name: 'main',
        query: this.routerQuery,
      }).catch(err => {});
    },
  },
};
</script>

<style lang="scss">

.search, .pam, .table-container {
  width: 75%;
  margin: 0 auto;
  max-width: 1000px;

}

@media screen and (max-width: 750px) {
  .search, .pam, .table-container {
    width: 98%;
  }
  .post-type {
    display: none !important;
  }

}

.post-title {
  text-align: center;
  display: block;
  margin: 0 auto;
}

.paginate-links {
  float: right;
}

.post-label {
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
.filter-by-owner .v-select .vs__dropdown-toggle{
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
}

.vs__clear:hover {
  background-color: transparent;
}

/* .vs__clear {
  fill: black;
} */

.v-select .vs__dropdown-toggle{
  border-radius: 0;
  padding:0;
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
#archive-results .vdp-datepicker__calendar .cell.selected,
#archive-results .vdp-datepicker__calendar .cell.selected.highlighted,
#archive-results .vdp-datepicker__calendar .cell.selected:hover {
  background: #25cef7;
}

.vs__dropdown-option--highlight.vs__dropdown-option{
  background: #0f4d90;
  color: white;
}


</style>