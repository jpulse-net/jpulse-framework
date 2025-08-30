// webapp/static/view/user/Profile.js

export default {
  name: 'Profile',
  inject: ['$context', '$jPulse'],
  template: `
  <JPulseLayout>
    <div class="profile-container">
      <div v-if="user" class="profile-header">
          <div class="profile-avatar">{{ initials }}</div>
          <div class="profile-info">
              <h1>{{ user.profile.firstName }} {{ user.profile.lastName }}</h1>
              <div class="user-details">@{{ user.loginId }} • {{ user.email }}</div>
              <div class="user-details">
                  <span :class="['status-badge', 'status-' + user.status]">{{ user.status }}</span>
              </div>
          </div>
      </div>

      <div v-if="user" class="profile-section">
          <h3>{{ $context.i18n.user.profile.personalInfo }}</h3>
          <form @submit.prevent="saveProfile">
              <div class="form-row">
                  <div class="form-group">
                      <label for="firstName">{{ $context.i18n.user.profile.firstName }}</label>
                      <input type="text" v-model="form.profile.firstName" :readonly="!editMode" :class="{ 'read-only-field': !editMode }">
                  </div>
                  <div class="form-group">
                      <label for="lastName">{{ $context.i18n.user.profile.lastName }}</label>
                      <input type="text" v-model="form.profile.lastName" :readonly="!editMode" :class="{ 'read-only-field': !editMode }">
                  </div>
              </div>
              <div class="form-row">
                  <div class="form-group">
                      <label for="nickName">{{ $context.i18n.user.profile.nickName }}</label>
                      <input type="text" v-model="form.profile.nickName" :readonly="!editMode" :class="{ 'read-only-field': !editMode }">
                  </div>
                  <div class="form-group">
                      <label for="email">{{ $context.i18n.user.profile.email }}</label>
                      <input type="email" :value="user.email" readonly class="read-only-field">
                  </div>
              </div>
          </form>
      </div>
      
      <div v-if="user" class="profile-section">
          <h3>{{ $context.i18n.user.profile.preferences }}</h3>
          <form>
              <div class="form-row">
                  <div class="form-group">
                      <label for="language">{{ $context.i18n.user.profile.language }}</label>
                      <select v-model="form.preferences.language" :disabled="!editMode" :class="{ 'read-only-field': !editMode }">
                          <option value="en">English</option>
                          <option value="de">Deutsch</option>
                      </select>
                  </div>
                  <div class="form-group">
                      <label for="theme">{{ $context.i18n.user.profile.theme }}</label>
                      <select v-model="form.preferences.theme" :disabled="!editMode" :class="{ 'read-only-field': !editMode }">
                          <option value="light">{{ $context.i18n.user.profile.themeLight }}</option>
                          <option value="dark">{{ $context.i18n.user.profile.themeDark }}</option>
                      </select>
                  </div>
              </div>
          </form>
      </div>

      <div class="btn-group">
          <button v-if="!editMode" @click="toggleEditMode(true)" class="btn btn-primary">Edit Profile</button>
          <button v-if="editMode" @click="saveProfile" class="btn btn-success">Save Changes</button>
          <button v-if="editMode" @click="toggleEditMode(false)" class="btn btn-secondary">Cancel</button>
      </div>

      <div v-if="!user" class="loading">Loading profile...</div>
    </div>
  </JPulseLayout>
  `,
  data() {
    return {
      user: null,
      form: {
        profile: {
          firstName: '',
          lastName: '',
          nickName: '',
        },
        preferences: {
          language: 'en',
          theme: 'light',
        },
      },
      editMode: false,
    };
  },
  computed: {
      initials() {
          if (!this.user) return '?';
          return (this.user.profile?.firstName?.charAt(0) || '') + (this.user.profile?.lastName?.charAt(0) || '');
      }
  },
  methods: {
    toggleEditMode(editing) {
      this.editMode = editing;
      if (!editing) {
        this.resetForm();
      }
    },
    resetForm() {
        this.form.profile.firstName = this.user.profile.firstName;
        this.form.profile.lastName = this.user.profile.lastName;
        this.form.profile.nickName = this.user.profile.nickName;
        this.form.preferences.language = this.user.preferences.language;
        this.form.preferences.theme = this.user.preferences.theme;
    },
    async loadProfileData() {
        try {
            const response = await this.$jPulse.apiCall('/api/1/user/profile');
            if(response.success) {
                this.user = response.data.data;
                this.resetForm();
            } else {
                this.$jPulse.alert('Failed to load profile data.');
            }
        } catch (error) {
            this.$jPulse.alert('A network error occurred while fetching profile data.');
        }
    },
    async saveProfile() {
        try {
            const response = await this.$jPulse.apiCall('/api/1/user/profile', {
                method: 'PUT',
                body: JSON.stringify(this.form)
            });
            if(response.success) {
                this.$jPulse.showMessage('Profile updated successfully!', 'success');
                this.user = response.data.data;
                this.toggleEditMode(false);
            } else {
                this.$jPulse.alert(response.data.error || 'Failed to update profile.');
            }
        } catch (error) {
            this.$jPulse.alert('A network error occurred while saving the profile.');
        }
    }
  },
  created() {
    this.loadProfileData();
  }
};
