<template>
  <div id="archives">
    <fieldset>
      <div class="search">
        <input
          id="search-bar"
          v-model="searchedValue"
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
              v-model="checkedTemplates"
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
            :disabled="state.disabled"
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
            :disabled="state.disabled"
            @closed="filterPosts()"
          />
        </div>
        <div class="cell medium-11 small-24 auto filter-by-owner">
          <v-select
            ref="categorySelect"
            v-model="selectedCategory"
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
            <th class="title">
              Title
            </th><th class="date">
              Publish date
            </th><th>Department</th>
            <th> Post Type</th>
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
            <td>
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
      />
    </div>
  </div>
  <!-- v if loading shw spinny boy -->
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
Vue.component('v-select', vSelect);
// import vmodal from 'vue-js-modal';

const endpoint =
  "https://cors-anywhere.herokuapp.com/phila.gov/wp-json/the-latest/v1/";

export default {
  name: "Archives",
  components: { Datepicker,
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
      
      searchedValue: "",
      selectedCategory: "",
      checkedTemplates: [],
      categories: [],
      endpointCategories: [],
      endpointCategoriesSlang: [],
      
      paginate: [ "filteredPosts" ],
      loading: false,
      emptyResponse: false,
      failure: false,

      startDate: '',
      endDate: '',
      
      state: {
        disabled: false,
      },
      
      searchOptions: {
        shouldSort: false, 
        threshold: 0.4, 
        keys: [
          'title',
          'categories.name',
          'tag.name',
          'tag.slug',
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

  },

  watch: {

    selectedCategory (value) {
      this.updateRouterQuery('selectedCategory', value);
    },

    checkedTemplates (value) {
      this.updateRouterQuery('checkedTemplates', value);
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

  created: async function() {
    await this.getAllPosts();
    await this.getAllCategories();
    await this.init();
  },

  mounted : async function() {
    this.filterPosts();
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
            this.filteredPosts = response.data;
            this.successfulResponse;
            this.getDropdownCategories();
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
          if (newCategory !== "") {
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

    filterByDate: function () {
      if ((this.startDate !== "" ) && (this.endDate !== "")) {
        
        let start = moment(this.startDate).unix();
        let end = moment(this.endDate).unix();

        if (end < start) {
          console.log('error');
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
          this.filteredPosts = this.datedPosts;
        }
      } else {
        this.filteredPosts = this.searchPosts;
      }
    },

    filterBySearch: function() {
      if (this.searchedValue !== '') { // there is nothing in the search bar -> return everything in filteredPosts
        this.searchPosts = [];
        this.$search(this.searchedValue, this.templatePosts, this.searchOptions).then(posts => {
          this.searchPosts = posts;
        });
      } else {
        this.searchPosts = this.templatePosts;
      }
    },

    filterByDepartment: function() {
      if (this.selectedCategory !== "" && this.selectedCategory !== null) { 
        this.$search(this.selectedCategory, this.posts, this.categoryOptions).then(posts => {
          this.categoryPosts = posts;
        });
      } else {
        this.categoryPosts = this.posts;
      }  
    },

    filterByPostType: function() {
      if (this.checkedTemplates.length !== 0) {
        this.templatePosts = [];
        this.categoryPosts.forEach((post) => {
          let postType = post.template;
          if (this.checkedTemplates.includes(postType)) {
            this.templatePosts.push(post);
          }
        });
      } else {
        this.templatePosts = this.categoryPosts;
      } 
    },

    amendPostTypeList: function (postValue) {
      if (!this.checkedTemplates.includes(postValue)) {  // && postValue === one of the keys in templates (need to error check against injected values)? 
        this.checkedTemplates.push(postValue);
      } else if (this.checkedTemplates.includes(postValue)) {
        this.checkedTemplates = this.checkedTemplates.filter(item => item !== postValue); 
      }
      this.filterPosts();
    },

    filterPosts: async function () {
      await this.filterByDepartment();
      await this.filterByPostType();
      await this.filterBySearch();
      await this.filterByDate();

    },

    searchFilter: async function() {
  
      await this.filterPosts();
      await this.updateRouterQuery('searchedValue', this.searchedValue);
      
    },

    clearAllFilters: function () {
      this.searchedValue = '';
      this.checkedTemplates = [];
      this.startDate = '';
      this.endDate = '';
      this.selectedCategory = '';
      this.failure = false;
      this.resetRouterQuery();

      this.filteredPosts = this.posts;
    },


    onSubmit: function() {},
    goToPost: function(link) {
      window.location.href = link;
    },

    init : function() {
      if (Object.keys(this.$route.query).length !== 0) {
        console.log("routing from url");

        for (let key in this.$route.query) {
          if(key === "checkedTemplates"){
            Vue.set(this, key, this.returnArray(this.$route.query[key]));

          } else if (key === "startDate" || key === "endDate"){  
            let value = this.$route.query[key];

            value = moment.unix(value).format("MMM. DD, YYYY");
            console.log(value);
            Vue.set(this, key, value);
          
          }else {
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
      if (typeof value === 'undefined' || value === "" || value === null) {
        Vue.delete(this.routerQuery, key);
      } else {
        Vue.set(this.routerQuery, key, value);
      
      }
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

<style>

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