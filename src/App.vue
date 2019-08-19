<template>
  <div id="archives-app">
    <fieldset>
      <input
        id="search-bar"
        v-model="searchedValue"
        class="search-field"
        type="text"
        placeholder="Search by title or department"
        @keyup.enter="filterPosts();"
      ><input
        ref="archive-search-bar"
        type="submit"
        class="search-submit"
        value="Search"
        @click="filterPosts();"
      >
      <div
        v-for="(value, key) in templates"
        :key="key"
      >
        <input
          :id="key"
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
      <div class="cell medium-4 small-11">
        <datepicker
          v-model="state.startDate"
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
          v-model="state.endDate"
          name="endDate"
          placeholder="End date"
          format="MMM. dd, yyyy"
          :disabled="state.disabled"
          @closed="filterPosts()"
        />
      </div>
      <div class="cell medium-9 small-24 auto filter-by-owner">
        <v-select
          ref="categorySelect"
          v-model="selectedCategory"
          label="slang_name"
          placeholder="All departments"
          :options="categories"
          @input="filterPosts()"
        />
      </div>
    </fieldset>
    <paginate 
      name="filteredPosts"
      :list="filteredPosts"
      class="paginate-list"
      tag="tbody"
      :per="25"
    >
      <div
        v-for="post in paginated('filteredPosts')"
        :key="post.id" 
        :href="'phila.gov' + post.link" 
        target="_blank" 
        class="post-title"
      >
        <span> {{ post.title }} </span>
        --
        <span>{{ post.date | formatDate }}</span>
        --
        <span
          v-for="(category, i) in post.categories"
          :key="category + '-' + i"
        >
          <span>{{ category.slang_name }}</span>
          <span v-if="i < post.categories.length - 1">,&nbsp;</span>
        </span>
      </div>
    </paginate>
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
        return moment( String(value) ).format('MMM. DD, YYYY');
      }
    },
  },
  data: function() {
    return {
      posts: [],
      filteredPosts: [],
      templatePosts: [],
      datedPosts: [],
      
   
      searchedValue: "",
      
      paginate: [ "filteredPosts" ],
      loading: false,
      emptyResponse: false,
      failure: false,

      searchOptions: {
        shouldSort: false, //keeps it in reverse chronological order instead of sorting by weight
        threshold: 0.5, //lower threshold for more exact results
        keys: [
          'title',
          'categories.name',
          'tag.name',
        ],
      },
      templateOptions: {
        shouldSort: false,
        threshold: 0.0, //must be identical to template keys
        keys: [
          'template',
        ],
      },
      categoryOptions: {
        shouldSort: false,
        threshold: 0.0,

        keys: [
          'categories.slang_name',
        ],
      },
      templates: {
        featured: "Featured",
        action_guide: "Action guides",
        post: "Posts",
        press_release: "Press releases",
      },
      
      checkedTemplates: [],
      categories: [],
      endpointCategories: [],
      endpointCategoriesSlang: [],

      selectedCategory: "",
   
      state: {
        startDate: '',
        endDate: '',
        disabled: false,
      },
      
    };
  },
  computed: { },
  mounted: function() {
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
            this.filteredPosts = response.data;
            this.successfulResponse;
            console.log("got posts woop");
            this.getDropdownCategories();
          })
          .catch(e => {
            this.failure = true;
            console.log(e);
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
          this.categories.push(newCategory);
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

      
      if ((this.state.startDate !== "" ) && (this.state.endDate !== "")) {
        
        // console.log(this.state.startDate);
        // let unixtime = moment(this.state.startDate).unix();
       
        let start = moment(this.state.startDate).unix();
        let end = moment(this.state.endDate).unix();

        if (end < start) {
          console.log('error');
          //make it so that this is not possible?
          //disable end dates after start date
        } else {

         

          this.datedPosts = [];
          this.filteredPosts.forEach((post) => {
            let postDate = moment(post.date).unix();
            
            if ((postDate >= start) && (postDate <= end )) {
              this.datedPosts.push(post);
            }

          });

          console.log(this.datedPosts);
          
          this.filteredPosts = this.datedPosts;
          console.log('filtering by date');
        }

        //  this.filteredPosts = this.datedPosts;

      }

    },


    filterBySearch: function() {
      
      if (this.searchedValue !== '') { // there is nothing in the search bar -> return everything in filteredPosts
        console.log('filtering by search');
        this.$search(this.searchedValue, this.filteredPosts, this.searchOptions).then(posts => {
          this.filteredPosts = posts;
        });
      }
      

    },

    filterByDepartment: function() {
      //why is this returning things that dont match
      if (this.selectedCategory !== "" && this.selectedCategory !== null) { 
        this.$search(this.selectedCategory, this.filteredPosts, this.categoryOptions).then(posts => {
          this.filteredPosts = posts;
        });
        console.log('filtering by dept');
      }  

    },

    filterByPostType: function() {

      
      if (this.checkedTemplates.length !== 0) {
     
        this.templatePosts = [];

        console.log(this.filteredPosts);

        for (var i = 0; i < this.checkedTemplates.length; ++i) {
          this.$search(this.checkedTemplates[i], this.filteredPosts, this.templateOptions).then(posts => {
            this.templatePosts = this.templatePosts.concat(posts);
            console.log('filtering by template');
            this.filteredPosts = this.templatePosts;
          });
          
        }
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

    filterPosts: function () {

      this.filteredPosts = this.posts;

      this.filterByDepartment();
      this.filterByPostType();
      this.filterByDate();
      this.filterBySearch();
      
      

    },

    onSubmit: function() {},
    goToPost: function(link) {
      window.location.href = link;
    },
  },
};
</script>

<style>
.post-title {
  text-align: center;
  display: block;
  margin: 0 auto;
}

.post-label {
  user-select: none;
}

.filter-by-owner{
  font-family:"Open Sans", Helvetica, Roboto, Arial, sans-serif !important;
}
.filter-by-owner .v-select .dropdown-toggle{
  border:none;
  background:white;
}
.filter-by-owner .v-select .open-indicator{
  bottom:0;
  top:0;
  right:0;
  background: #0f4d90;
  padding: 0 0 0 9px;
  width: 30px;
  height:inherit;
}
.v-select .vs__actions{
  padding:0;
}
.v-select .dropdown-toggle{
  border-radius: 0;
  padding:0;
}
.filter-by-owner .v-select input[type=search],
.v-select input[type=search]:focus{
  border:none;
}
.filter-by-owner .v-select .open-indicator:before{
  border-color:white;
}
.filter-by-owner .v-select input[type=search],
.filter-by-owner .v-select input[type=search]:focus {
  height: 2.4rem;
  margin:0;
}
.filter-by-owner ul.dropdown-menu{
  border:none;
  font-weight: bold;
}
.filter-by-owner ul.dropdown-menu li{
  border-bottom: 1px solid #f0f0f0;

}
.filter-by-owner ul.dropdown-menu li a{
  color: #0f4d90;
  padding:1rem;
}
.filter-by-owner ul.dropdown-menu li a:hover{
  background: #0f4d90;
  color:white;
}
.filter-by-owner .v-select .dropdown-menu > .highlight > a {
  background: #0f4d90;
  color: white;
}
.filter-by-owner .v-select.single .selected-tag{
  background-color: #f0f0f0;
  border: none;
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
#archive-results .vdp-datepicker__calendar .cell.selected:hover{
  background: #25cef7;
}


</style>