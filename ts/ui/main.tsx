import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as $ from 'jquery';
import * as ajaxon from 'ajaxon';
let $J = ajaxon.getAJaxon($);
import {IAppSettings} from '../appParams';
import {IConnectedApp, IAuthorizedUser, IUsernameParams} from 'polaris-auth-client';
import * as reCaptcha from '../reCaptcha';
import * as uiInt from '../uiInterfaces';

let appSettings: IAppSettings = global["__appSettings"];

let getParameterByName = (name:string, url?:string) : string => {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)", "i"),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}

type I$P = (path:string, data:any, done: ajaxon.ICompletionHandler) => void;

let get$P = (p: string) : I$P => {
	return ((path:string, data:any, done: ajaxon.ICompletionHandler) : void => {
		$J('POST', path, data, done, {'x-p': p});
	});
}

interface IGlobal {
	passwordResetPINEmail?:string;
	temporaryPassword?:string;
	signUpUserName?:string;
}

let __global:IGlobal = {};

var Login = React.createClass({
	getInitialState: () => ({username: '', password: ''}),
	handleUsernameChange: function(e) {
		//console.log('username changed to ' + e.target.value);
		this.setState({username: e.target.value});
	},
	handlePasswordChange: function(e) {
		//console.log('password changed to ' + e.target.value);
		this.setState({password: e.target.value});
	},
	handleSubmit: function(event) {
		let username = this.state.username.trim();
		let password = this.state.password.trim();
		if (!username || !password) {
			alert('username and password are required');
		} else {
			let data: uiInt.ILoginParams = {
				username: username
				,password: password
				,signUpUserForApp: false
			};
			this.props.$P('/services/client/login', data, (err:any, ret:uiInt.ILoginResult) => {
				if (err)
					alert('invalid username or password: ' + JSON.stringify(err));
				else {
					// login successful, redirecting to the app url
					window.location.replace(ret.redirect_url);
				}
			});
		}
	},
	render: function() {
		let hiddenFrameStyle = {'display': 'none'};
		let forgetMyPasswordStyle = (this.props.connectedApp.allow_reset_pswd ? {} : {'display': 'none'});
		let createNewAccountStyle = (this.props.connectedApp.allow_create_new_user ? {} : {'display': 'none'});
		return (
			<div>
				<div className="w3-container w3-blue">
					<h2 id="title">{this.props.connectedApp.name} Sign In</h2>
				</div>
				<iframe name="hidden_frame" style={hiddenFrameStyle} src="about:blank"></iframe>
				<form className="w3-container" autoComplete="on" target="hidden_frame" action="about:blank">
					<p><label>Sign in with your {appSettings.companyName} account</label></p>
					<p><input className="w3-input" type="text" name="username" placeholder="Username" value={this.state.username} onChange={this.handleUsernameChange}/></p>
					<p><input className="w3-input" type="password" name="password" placeholder="Password" value={this.state.password} onChange={this.handlePasswordChange}/></p>
					<p><input className="w3-btn w3-white w3-border w3-border-blue w3-round" type="submit" onClick={this.handleSubmit} value="Sign in"/></p>
				</form>
				<div className="w3-container w3-white">
					<p><a href="#reset_password" style={forgetMyPasswordStyle}>I forgot my password</a></p>
					<p style={createNewAccountStyle}>No account? <a href="#sign_up_check">Sign up</a></p>
				</div>
			</div>
		);	
	}
});

var ResetPasswordSendPin = React.createClass({
	getInitialState: () => ({email: ''}),
	handleEmailChange: function(e) {
		//console.log('email changed to ' + e.target.value);
		this.setState({email: e.target.value});
	},
	handleSubmit: function(event) {
		event.preventDefault();
		var email = this.state.email.trim();
		if (!email) {
			alert('Email is required');
		} else {
			var data = {
				username: email
			};
			this.props.$P('/services/client/sspr', data, (err:any, ret:any) => {
				if (err)
					alert('invalid email: ' + JSON.stringify(err));
				else {
					__global.passwordResetPINEmail = email;
					window.location.hash = "#reset_pswd_enter_pin";
				}
			});
		}
	},
	render: function() {
		return (
			<div>
				<div className="w3-container w3-blue">
					<h2 id="title">Forgot Your Password?</h2>
				</div>
				<form className="w3-container">
					<p>
						<label>No problem. Just enter your email below and we will send you a PIN number for you to reset the password</label>
						<input className="w3-input" type="text" placeholder="Email" value={this.state.email} onChange={this.handleEmailChange}/>
					</p>
					<p>
						<a className="w3-btn w3-white w3-border w3-border-blue w3-round w3-margin-right" href="#login"><i className="fa fa-chevron-left" aria-hidden="true"></i> Back</a>
						<button className="w3-btn w3-white w3-border w3-border-blue w3-round" onClick={this.handleSubmit}>Send me a PIN number</button>
					</p>
				</form>
			</div>
		);
	}
});

var ResetPasswordEnterPin = React.createClass({
	getInitialState: () => ({pin: ''}),
	handlePINChange: function(e) {
		//console.log('pin changed to ' + e.target.value);
		this.setState({pin: e.target.value});
	},
	handleSubmit: function(event) {
		event.preventDefault();
		var pin = this.state.pin.trim();
		if (!pin) {
			alert('PIN number is required');
		} else {
			var data = {
				pin: pin
			};
			this.props.$P('/services/client/reset_password', data, (err:any, ret:any) => {
				if (err)
					alert('invalid PIN number: ' + JSON.stringify(err));
				else {
					__global.temporaryPassword = ret.temporaryPassword;
					window.location.hash = "#reset_pswd_done";
				}
			});
		}
	},
	render: function() {
		return (
			<div>
				<div className="w3-container w3-blue">
					<h2 id="title">Password Reset</h2>
				</div>
				<form className="w3-container">
					<h5><p>A PIN number has been sent to the email address: <span style={{"fontWeight":"bold"}}>{__global.passwordResetPINEmail}</span></p></h5>
					<p>
						<label>Please enter the PIN number your received in your email and click the Reset My Password button</label>
						<input className="w3-input" type="text" placeholder="PIN number" value={this.state.pin} onChange={this.handlePINChange}/>
					</p>
					<p>
						<button className="w3-btn w3-white w3-border w3-border-blue w3-round" onClick={this.handleSubmit}>Reset My Password</button>
					</p>
				</form>
			</div>
		);
	}
});

var ResetPasswordDone = React.createClass({
	render: function() {
		return (
			<div>
				<div className="w3-container w3-blue">
					<h2 id="title">Password Reset Successful</h2>
				</div>
				<div className="w3-container">
					<h5>
						<p>Great! Your password has been reset successfully.</p>
						<p>Your new temporary password is: <span style={{"fontWeight":"bold"}}>{__global.temporaryPassword}</span></p>
						<p>Please go ahead and sign in with the temporary passsword. Once sign in, you can change the password to your preference.</p>
					</h5>
					<p><a href= "#login" className="w3-btn w3-white w3-border w3-border-blue w3-round">Sign in with the temporary password</a></p>
				</div>
			</div>
		);	
	}
});

// if (!/^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i.test(email))

var SingUpCheck = React.createClass({
	getInitialState: () => ({username: ''}),
	handleEmailChange: function(e) {
		this.setState({username: e.target.value});
	},
	handleSubmit: function(event) {
		event.preventDefault();
		var username = this.state.username.trim();
		if (!username) {
			alert('Username is required');
		} else {
			let params: IUsernameParams = {username};
			this.props.$P('/services/client/lookup_user', params, (err:any, user:IAuthorizedUser) => {
				if (err) {
					__global.signUpUserName = username.toLowerCase();
					window.location.hash = "#create_account";
				} else {
					__global.signUpUserName = user.userName;
					window.location.hash = "#sign_up_login";
				}
			});
		}
	},
	render: function() {
		return (
			<div>
				<div className="w3-container w3-blue">
					<h2 id="title">Sign up for {this.props.connectedApp.name}</h2>
				</div>
				<form className="w3-container">
					<p>
						<label>Please enter a user name:</label>
						<input className="w3-input" type="text" placeholder="account@domain.com" value={this.state.username} onChange={this.handleEmailChange.bind(this)}/>
					</p>
					<p>
						<a className="w3-btn w3-white w3-border w3-border-blue w3-round w3-margin-right" href="#login"><i className="fa fa-chevron-left" aria-hidden="true"></i> Back</a>
						<button className="w3-btn w3-white w3-border w3-border-blue w3-round" onClick={this.handleSubmit.bind(this)}>Next <i className="fa fa-chevron-right" aria-hidden="true"></i></button>
					</p>
				</form>
			</div>
		);	
	}
});

var SignUpAndLogin = React.createClass({
	getInitialState: () => ({password: ''}),
	handlePasswordChange: function(e) {
		//console.log('password changed to ' + e.target.value);
		this.setState({password: e.target.value});
	},
	handleSubmit: function(event) {
		event.preventDefault();
		var password = this.state.password.trim();
		if (!password) {
			alert('password are required');
		} else {
			let data: uiInt.ILoginParams = {
				username: __global.signUpUserName
				,password: password
				,signUpUserForApp: true
			};
			this.props.$P('/services/client/login', data, (err:any, ret:uiInt.ILoginResult) => {
				if (err)
					alert('invalid username or password: ' + JSON.stringify(err));
				else {
					window.location.replace(ret.redirect_url);
				}
			});
		}
	},
	render: function() {
		var forgetMyPasswordStyle = (this.props.connectedApp.allow_reset_pswd ? {} : {'display': 'none'});
		return (
			<div>
				<div className="w3-container w3-blue">
					<h2 id="title">Sign up for {this.props.connectedApp.name}</h2>
				</div>
				<form className="w3-container">
					<h4><p>Great! It looks like you already have a {appSettings.companyName} account with us. Just enter the account password to sign up for {this.props.connectedApp.name}</p></h4>
					<p><label>{__global.signUpUserName}</label></p>
					<p><input className="w3-input" type="password" name="password" placeholder="Password" value={this.state.password} onChange={this.handlePasswordChange}/></p>
					<p><button className="w3-btn w3-white w3-border w3-border-blue w3-round" onClick={this.handleSubmit}>Sign up for {this.props.connectedApp.name}</button></p>
				</form>
			</div>
		);	
	}
});

var CreateAccount = React.createClass({
	getInitialState: () => (
		{
			firstName: ''
			,lastName: ''
			,email: ''
			,companyName: ''
			,mobilePhone: ''
			,password: ''
			,passwordConfirm: ''
			,promotionalMaterial: true
		}
	),
	componentDidMount: function() {
		let __grecaptcha: reCaptcha.IreCaptcha = global["grecaptcha"];
		this.captchaId = __grecaptcha.render('sign_up_captcha', {
          sitekey : appSettings.reCaptchaSiteKey
        });
	},
	getHandleTextFieldChange: function(field) {
		return ((e) => {
			var o = {};
			o[field] = e.target.value;
			this.setState(o);
		});
	},
	getHandleCheckBoxFieldChange: function(field) {
		return ((e) => {
			var o = {};
			o[field] = !this.state[field];
			this.setState(o);
		});
	},
	handleSubmit: function(event) {
		event.preventDefault();
		let __grecaptcha: reCaptcha.IreCaptcha = global["grecaptcha"];
		//console.log(JSON.stringify(this.state));
		var username = __global.signUpUserName;
		var firstName = this.state.firstName.trim();
		var lastName = this.state.lastName.trim();
		var email = this.state.email.trim();
		var companyName = this.state.companyName.trim();
		var mobilePhone = this.state.mobilePhone.trim();
		var promotionalMaterial = this.state.promotionalMaterial;
		var password = this.state.password.trim();
		var passwordConfirm = this.state.passwordConfirm.trim();
						
		if (!password)
			alert('password are required');
		else if (password !== passwordConfirm)
			alert('password rentered not matching the original');
		else if (!firstName)
			alert('First name is required');
		else if (!lastName)
			alert('Last name is required');
		else if (!email)
			alert('Email is required');
		else {
			var data = {
				username: username
				,password: password
				,firstName: firstName
				,lastName: lastName
				,email: email
				,companyName: (companyName ? companyName : null)
				,mobilePhone: mobilePhone
				,promotionalMaterial: promotionalMaterial
				,'g-recaptcha-response': __grecaptcha.getResponse(this.captchaId)
			};
			this.props.$P('/services/client/sign_up_new_user', data, (err:any, ret:any) => {
				if (err)
					alert('!!! Error: ' + JSON.stringify(err));
				else {
					alert('account created :-)');
					window.location.hash = "#login";
				}
			});
		}
	},
	render: function() {
		return (
			<div>
				<div className="w3-container w3-blue">
					<h2 id="title">Create {appSettings.companyName} Account</h2>
				</div>
				<form className="w3-container">
					<p><label>User name: {__global.signUpUserName}</label></p>
					<p><label>First name*</label><input className="w3-input" type="text" value={this.state.firstName} onChange={this.getHandleTextFieldChange('firstName')}/></p>
					<p><label>Last name*</label><input className="w3-input" type="text" value={this.state.lastName} onChange={this.getHandleTextFieldChange('lastName')}/></p>
					<p><label>Email*</label><input className="w3-input" type="text" placeholder="account@domain.com" value={this.state.email} onChange={this.getHandleTextFieldChange('email')}/></p>
					<p><label>Company name</label><input className="w3-input" type="text" value={this.state.companyName} onChange={this.getHandleTextFieldChange('companyName')}/></p>
					<p><label>Mobile phone*</label><input className="w3-input" type="text" value={this.state.mobilePhone} onChange={this.getHandleTextFieldChange('mobilePhone')}/></p>
					<p><label>Password*</label><input className="w3-input" type="password" placeholder="Password" value={this.state.password} onChange={this.getHandleTextFieldChange('password')}/></p>
					<p><label>Reenter password*</label><input className="w3-input" type="password" placeholder="Password" value={this.state.passwordConfirm} onChange={this.getHandleTextFieldChange('passwordConfirm')}/></p>
					<p>Before proceeding, we need to make sure a real person is creating this account.</p>
					<div id="sign_up_captcha"></div>
					<p><input className="w3-check" type="checkbox" defaultChecked={this.state.promotionalMaterial} onChange={this.getHandleCheckBoxFieldChange('promotionalMaterial')}/><label>  Send me promotional offers from {appSettings.companyName}. You can unsubscribe at any time.</label></p>
					<p>
						<a className="w3-btn w3-white w3-border w3-border-blue w3-round w3-margin-right" href="#sign_up_check"><i className="fa fa-chevron-left" aria-hidden="true"></i> Back</a>
						<button className="w3-btn w3-white w3-border w3-border-blue w3-round" onClick={this.handleSubmit.bind(this)}>Create Account</button>
					</p>
				</form>
			</div>
		);	
	}
});

interface ISharedProps {
	$P:I$P;
	connectedApp: IConnectedApp;
}

interface IOAuth2LoginAppProps extends ISharedProps {
	mode: string;
}

class OAuth2LoginApp extends React.Component<IOAuth2LoginAppProps, {}> {
	render() {
		let UI = null;
		if (this.props.mode === 'login')
			UI = Login;
		else if (this.props.mode === 'reset_password')
			UI = ResetPasswordSendPin;
		else if (this.props.mode === 'reset_pswd_enter_pin')
			UI = ResetPasswordEnterPin;
		else if (this.props.mode === 'reset_pswd_done')
			UI = ResetPasswordDone;
		else if (this.props.mode === 'sign_up_check')
			UI = SingUpCheck;
		else if (this.props.mode === 'sign_up_login')
			UI = SignUpAndLogin;
		else if (this.props.mode === 'create_account')
			UI = CreateAccount;		
		return (<div><UI connectedApp={this.props.connectedApp} $P={this.props.$P}/></div>);		
	}
}

let $P = get$P(getParameterByName('p'));
$P('/services/client/get_connected_app', {}, (err:any, connectedApp: IConnectedApp) => {
	if (!err) {
		let mode = "login";
		ReactDOM.render(<OAuth2LoginApp mode={mode} connectedApp={connectedApp} $P={$P}/>, document.getElementById('main'));
		$(window).on('hashchange', function() {
			//alert('hash change');
			mode = (window.location.hash.length > 0 ? window.location.hash.substr(1) : 'login');
			ReactDOM.render(<OAuth2LoginApp mode={mode} connectedApp={connectedApp} $P={$P}/>, document.getElementById('main'));
		});
	}
});