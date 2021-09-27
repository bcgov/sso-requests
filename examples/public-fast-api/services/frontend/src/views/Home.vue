<template>
  <div class="home">
    <button v-on:click="login">Login</button>
    <button v-on:click="logout">Logout</button>
    <button v-on:click="fetchSecret">Get Secret</button>
    <p>{{ secretAnswer }}</p>
    <vue-json-to-table :data="kcDisplayedFields"></vue-json-to-table>
  </div>
</template>

<script>
// @ is an alias to /src
import axios from 'axios';

export default {
  name: 'Home',
  props: ['keycloak'],
  data() {
    return {
      secretAnswer: '',
    };
  },
  methods: {
    login: function () {
      this.$props.keycloak.login({ pkceMethod: 'S256', redirectUri: 'http://localhost:3000', idpHint: 'idir' });
    },
    logout: function () {
      this.$props.keycloak.logout();
    },
    fetchSecret: async function () {
      try {
        await this.$props.keycloak.updateToken(30);
        const result = await axios.get('/secret', {
          headers: { Authorization: `Bearer ${this.$props.keycloak.idToken}` },
        });
        this.secretAnswer = result.data;
      } catch {
        console.log('Handle api errors here');
        this.secretAnswer = 'Request failed';
      }
    },
  },
  computed: {
    kcDisplayedFields: function () {
      const { refreshTokenParsed, idTokenParsed, tokenParsed, clientId, realm, authServerUrl, redirectUri } =
        this.$props.keycloak;
      return { refreshTokenParsed, idTokenParsed, tokenParsed, clientId, realm, authServerUrl, redirectUri };
    },
  },
};
</script>
