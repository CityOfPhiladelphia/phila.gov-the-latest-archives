import BrowserSupport from './assets/browser-support.js';
BrowserSupport.isIE10();

import Vue from 'vue';
import App from './App.vue';
import VueRouter from 'vue-router';
import VuePaginate from 'vue-paginate';
import VueFuse from 'vue-fuse';
import vSelect from 'vue-select';
 
Vue.config.productionTip = false;
Vue.use(VueRouter);
Vue.use(VuePaginate);
Vue.use(VueFuse);
Vue.component('v-select', vSelect);


const router = new VueRouter({
  routes: [
    {
      path: '/',
      name: 'main',
    },
  ],
});

new Vue({ // eslint-disable-line no-new
  el: '#vue-app',
  router,
  render (h) {
    return h(App, {});
  },
});
