import 'bootstrap/dist/css/bootstrap.css';
import axios from 'axios';
import Vue from 'vue';
import Keycloak from 'keycloak-js';

import App from './App.vue';
import router from './router';
import VueJsonToTable from 'vue-json-to-table';
Vue.use(VueJsonToTable);

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:5000/'; // the FastAPI backend

Vue.config.productionTip = false;

let keycloak = Keycloak('/keycloak.json');

keycloak.init({ pkceMethod: 'S256', redirectUri: 'http://localhost:3000', idpHint: 'idir' }).then(() => {
  new Vue({
    router,
    render: (h) => h(App, { props: { keycloak } }),
  }).$mount('#app');
});
