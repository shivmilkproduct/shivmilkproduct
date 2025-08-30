  // get cookie from website
  const getCookieLoginPopup = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }


  const getSellerDomain =() =>{
    let seller_domain = document.getElementById('sellerDomain')?.value
      try{
        if(!seller_domain){
          seller_domain = window.location.hostname
        }
      }catch(err){
        console.error(err)
      }
      return seller_domain;
  }
  // set cookie to website with expire time if any 
  function setCookieLoginPopup(name, value, minutesToExpire) {
    if(minutesToExpire){
      var date = new Date();
      date.setTime(date.getTime() + (minutesToExpire * 60 * 1000));
      var expires = "expires=" + date.toUTCString();
      document.cookie = name + "=" + value + ";" + expires + ";path=/";
    }else{
      var date = new Date();
      date.setFullYear(date.getFullYear() + 10); // Set expiration to 10 years from now
      
      // Convert the date to a UTC string
      var expires = date.toUTCString();
      
      // Set the cookie with the expires attribute
      document.cookie = name + "=" + value + ";expires=" + expires + ";path=/";
    }
  }

  var HttpCallPopup = function (url, method, data, success, failure) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    if(url === "https://uptime2.fastrr.com/fe2") {
      xhr.timeout = 2000;
    }
  
    if (data) {
      xhr.send(data);
    } else {
      xhr.send();
    }
  
  
    // fallback
    const DONE =  (typeof XMLHttpRequest.DONE !== 'undefined') ? XMLHttpRequest.DONE : 4;
  
    xhr.onreadystatechange = function () {
      if (xhr.readyState === DONE) {
        let status = xhr.status;
        let response;
        try {
          response = JSON.parse(xhr.responseText);
        } catch (e) {
          response = xhr.responseText;
        }
  
        if (status === 0 || (status >= 100 && status < 300)) {
          if (typeof success === 'function') {
            return success(response);
          }
        } else {
          if (typeof failure == 'function') {
            return failure(response);
          }
        }
      }
    };
  };

  // variable definition 
  var isFastrrUp = 1
  var ipAddress = null
  const ShiprocketLoginPopupClosed = !!getCookieLoginPopup('shiprocketLoginPopupClosed') ? true : false;
  const uuid_cookie = getCookieLoginPopup('fastrr_uuid') ? getCookieLoginPopup('fastrr_uuid') : null;
  const usid_cookie = getCookieLoginPopup('fastrr_usid') ? getCookieLoginPopup('fastrr_usid') : null;
  const sellerConfigFL = getCookieLoginPopup('fastrr_seller_config') ? getCookieLoginPopup('fastrr_seller_config') : null;

  let pageVisitTime

  //update event payload based on page type and data available 
  const updatePayload = async(currentPayload, pageExit) => {
    const user_id = getCookieLoginPopup('fastrr_user_id') ? getCookieLoginPopup('fastrr_user_id') : null;
    const user_profile_id = getCookieLoginPopup('fastrr_user_profile_id') ? getCookieLoginPopup('fastrr_user_profile_id') : null;
    const pageType = window.ShopifyAnalytics?.meta?.page?.pageType
    switch(pageType?.toUpperCase()){
      case "PRODUCT" :
        return {
          ...currentPayload,
          "data": { // mapping : string, int , double
            "productID": window.ShopifyAnalytics?.meta?.product?.id ?? '',
            "productType": window.ShopifyAnalytics?.meta?.product?.type ?? '',
            "selectedVariantId": window.ShopifyAnalytics?.meta?.selectedVariantId ?? '',
            ...(pageExit ? {"durationMs": Date.now()-pageVisitTime} : {}),
            ...(user_id ? {user_id : user_id} : {}),
            ...(user_profile_id ? {user_profile_id : user_profile_id} : {})
            },
        }
        break;
      case "COLLECTION" :
        return {
          ...currentPayload,
          "data": { // mapping : string, int , double
            "resourceID": window.ShopifyAnalytics?.meta?.page?.resourceId ?? '',
            "resourceType": window.ShopifyAnalytics?.meta?.page?.resourceType ?? '',
            ...(pageExit ? {"durationMs": Date.now()-pageVisitTime} : {}),
            ...(user_id ? {user_id : user_id} : {}),
            ...(user_profile_id ? {user_profile_id : user_profile_id} : {})
            },
        }
        break;
      case "CART" :
        const response = await fetch(`${window.location.origin}${window.location.pathname}.js`);
        const data = await response.json();
        return {
          ...currentPayload,
          "data": { // mapping : string, int , double
            itemCount : data?.item_count,
            totalPrice : data?.total_price,
            totalDiscount : data?.total_discount,
            ...(pageExit ? {"durationMs": Date.now()-pageVisitTime} : {}),
            ...(user_id ? {user_id : user_id} : {}),
            ...(user_profile_id ? {user_profile_id : user_profile_id} : {})
          },
          "cdata": data?.items?.length ? 
          data?.items?.map((itemDetails)=>{
            return {
              itemName : itemDetails?.title,
              quantity : itemDetails?.quantity,
              price : itemDetails?.price,
              discountedPrice : itemDetails?.discounted_price
            }
          }) : []
        }
        break;
      default : 
        return {
          ...currentPayload,
          ...((pageExit || user_id) ? {
            data : {
              ...(pageExit ? { "durationMs": Date.now()-pageVisitTime} : {}),
              ...(user_id ? {user_id : user_id} : {}),
              ...(user_profile_id ? {user_profile_id : user_profile_id} : {})
            }
          } : {}),
        }
        break
    }
  }

  //send fastrr event and push session id cookie expiry by 30 mins
  const sendFastrrEvents = async(uuid_cookie,usid_cookie,pageExit,eventName) =>{
    const timestamp = new Date().toISOString();
    let eventPayload = {
      "uuid":uuid_cookie,
      "usid": usid_cookie,
      "et": timestamp,
      "etype": eventName,
      "ptype": window.ShopifyAnalytics?.meta?.page?.pageType,
      "pstype": "",
      "ppath": window.location.pathname,
    }
    eventPayload = await updatePayload(eventPayload,pageExit)
    HttpCallPopup(
      'https://events.pickrr.com/collect', 
      'POST', 
      JSON.stringify(eventPayload),
    )
    setCookieLoginPopup('fastrr_uuid',uuid_cookie)
    setCookieLoginPopup('fastrr_usid',usid_cookie,30)
  }

  // generate uuid 
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
  }

  //generate session id using uuid
  function generateSessionID(new_uuid) {
    const timestamp = Date.now();  
    return `${new_uuid}-${timestamp}`;
  }
  
  const triggerFastrLogin =async (accountIconClicked)=>{
    pageVisitTime = Date.now()    
    // variable definition 
      var isFastrrUp = 1
      var ipAddress = null
      const ShiprocketLoginPopupClosed = !!getCookieLoginPopup('shiprocketLoginPopupClosed') ? true : false;
      const ShiprocketLoginCompleted = !!getCookieLoginPopup('ShiprocketLoginCompleted') ? true : false;
      const uuid_cookie = getCookieLoginPopup('fastrr_uuid') ? getCookieLoginPopup('fastrr_uuid') : null;
      const usid_cookie = getCookieLoginPopup('fastrr_usid') ? getCookieLoginPopup('fastrr_usid') : null;
      const shopifyLoginError = getCookieLoginPopup('shopifyLoginError') ? getCookieLoginPopup('shopifyLoginError') : null;
      const sellerConfigFL = getCookieLoginPopup('fastrr_seller_config') ? getCookieLoginPopup('fastrr_seller_config') : null;
      const SessionShiprocketLoginCompleted = getCookieLoginPopup('SessionShiprocketLoginCompleted') ? true : false
      // sellerDomain = document.getElementById('sellerDomain')?.value
      // try{
      //   if(!sellerDomain){
      //     sellerDomain = window.location.hostname
      //   }
      // }catch(err){
      //   console.error(err)
      // }
      
      let uId = encodeURI(btoa(getSellerDomain()));
      let loginPopupEnabled = false
      let eventsEnabled = false
      let sellerConfigParent = null
      
      // seller config
      if(!sellerConfigFL){
        const url = 'https://events.pickrr.com/config';
        const headers = {
          'uId': uId
        };
  
        await fetch(url, {
          method: 'GET', // or 'POST', 'PUT', 'DELETE', etc.
          headers: headers,
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => {
          loginPopupEnabled = data?.data?.popupConfigList?.[0]?.enabled ?? false
          eventsEnabled = data?.data?.eventsEnabled ?? false
          setCookieLoginPopup('fastrr_seller_config',JSON.stringify(data),30)
          sellerConfigParent = JSON.stringify(data)
        })
        .catch(error => {
        })
      }else{
        const sellerConfig = JSON.parse(sellerConfigFL)
        sellerConfigParent = sellerConfigFL
        loginPopupEnabled = sellerConfig?.data?.popupConfigList?.[0]?.enabled ?? false
        eventsEnabled = sellerConfig?.data?.eventsEnabled ?? false
      }

      // set cookies and send fastrr events if fastrr is up and running
      if(eventsEnabled){
        if(!uuid_cookie){
          const new_uuid = generateUUID()
          const new_usid = generateSessionID(new_uuid)
          sendFastrrEvents(new_uuid,new_usid,false,"USER_EVENT_PAGE_TYPE")
        }
        if(!!uuid_cookie && !usid_cookie){
          const new_usid = generateSessionID(uuid_cookie)
          sendFastrrEvents(uuid_cookie,new_usid,false,"USER_EVENT_PAGE_TYPE")
        }
        if(!!uuid_cookie && !!usid_cookie){
          sendFastrrEvents(uuid_cookie,usid_cookie,false,"USER_EVENT_PAGE_TYPE")
        }
      }

      // open login popup
      
      if(!document.getElementById('headless-container') && ((!ShiprocketLoginPopupClosed && !ShiprocketLoginCompleted && !window.location?.pathname?.includes('/account') && loginPopupEnabled) || ((window.location?.pathname?.includes('/account')||accountIconClicked) && !shopifyLoginError)) && !window.ShopifyAnalytics?.meta?.page?.customerId) {
          const pageType =  window.location?.pathname?.includes('/account')||accountIconClicked ? 'account' : 'Landing';
          let headlessApplication = document.createElement('div');
          const url = `https://fastrr-boost-ui.pickrr.com/?popupType=shiprocketLogin&pageType=${pageType}&seller-domain=${getSellerDomain()}&ipAddress=${ipAddress}${SessionShiprocketLoginCompleted ? '&SessionShiprocketLoginCompleted=true' : ''}${sellerConfigParent ? `&sellerConfigParent=${window.btoa(encodeURIComponent(sellerConfigParent))}` : ''}`
          headlessApplication.id = 'headless-container';
          headlessApplication.innerHTML = 
          `<div class="headless-modal">
              <div class="headless-modal-content">
              <div class="headless-modal-body">
                  <iframe id="headless-iframe-login" src="${url}" allow="clipboard-read; clipboard-write"></iframe>
              </div>
              </div>
          </div>`;


          const bodyStyle = document.body.style;
          // store.bodyStyle = {
          //   // position: bodyStyle.position,
          //   top: bodyStyle.top,
          // };
          // bodyStyle.top = `-${window.scrollY}px`;
          // bodyStyle.position = 'fixed';
          bodyStyle.overflow = 'hidden'

          document.body.appendChild(headlessApplication)
      }

      let LoginActions = {};

      // close login popup
      const CloseLoginPopup = function () {
        setCookieLoginPopup('shiprocketLoginPopupClosed', '1',1440)
        const bodyStyle = document.body.style;
        const scrollY = bodyStyle.top;
        // bodyStyle.position = Store.bodyStyle.position;
        // bodyStyle.top = Store.bodyStyle.top;
        document.getElementById('headless-container').remove();
        document.querySelector('body').style.overflow = "auto";
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      };

      const loginCompleted = function () {
        setCookieLoginPopup('ShiprocketLoginCompleted', '1')
        setCookieLoginPopup('SessionShiprocketLoginCompleted','1',1440)
      };

      const saveCouponCode = function (couponCode) {
          localStorage.setItem('fastrrCouponCode',couponCode)
      };

      const handelShopifyLoginError = function(data) {
        setCookieLoginPopup('shopifyLoginError', '1',30)
        const bodyStyle = document.body.style;
        const scrollY = bodyStyle.top;
        // bodyStyle.position = Store.bodyStyle.position;
        // bodyStyle.top = Store.bodyStyle.top;
        document.getElementById('headless-container').remove();
        document.querySelector('body').style.overflow = "auto";
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
        window.location.href = '/account/register'
      }

      const handelShopifyLogin = () => {
        setCookieLoginPopup('SessionShiprocketLoginCompleted', '1',1)
      }

      const openTrueCaller = (data, payload) => {
        window.open(data, '_top')
        setTimeout(() => {
          if(document.hasFocus()) {
          } else {
              document.getElementById('headless-iframe-login')?.contentWindow?.postMessage(
                { trigger: "true-caller-request", payload}, '*'
              )
          }
        }, 600)
      }

      const ac = new AbortController();
      const FetchAndAutofillOtpLoginPopup = (e) => {
        navigator.credentials.get({
          otp: { transport:['sms'] },
          signal: ac.signal
        }).then((otp ) => {
          document.getElementById('headless-iframe-login').contentWindow.postMessage(
            { trigger: "otp-autofill", data: otp.code }, '*'
          )
        }).catch((err ) => {
        });
      }
    
      const startListeningMessageLoginPopup = () => {
        if ('OTPCredential' in window) {
          window.addEventListener('load', FetchAndAutofillOtpLoginPopup());
        }
      }
    
      const stopListeningMessageLoginPopup = () => {
        ac.abort()
        window.removeEventListener('load', FetchAndAutofillOtpLoginPopup());
      }

      LoginActions.loadStorage = function (data) {
          document.getElementById('headless-iframe-login').contentWindow.postMessage(
              {
              trigger: 'headless-storage',
              data: JSON.stringify(window.localStorage),
              },
              '*'
          );
      };

      let LoginPopupActionHandler = function (actions) {
          if (actions && actions.length > 0) {
              for (let action of actions) {
              if (typeof LoginActions[action.action] === 'function') {
                  LoginActions[action.action](action.data);
              }
              }
          }
      };

      //event listner from login popup iframe
      let ShiprocketLoginMessageListener = function (event) {
          const urlSearchParams = new URLSearchParams(window.location.search);  

          let data = event.data;
          switch (data.trigger) {
              case 'headless-storage':
                LoginPopupActionHandler(data.actions);
                break;
              case 'Login-popup-close':
                CloseLoginPopup();
                break;
              case 'save-coupon-code':
                saveCouponCode(data?.couponCode);
                break
              case 'login-completed':
                loginCompleted();
                break
              case 'Shopify-login-error':
                handelShopifyLoginError(data);
                break
              case 'open-true-caller-login':
                openTrueCaller(data?.data, data?.payload) 
                break;
              case 'otp-read-start':
                startListeningMessageLoginPopup() 
                break;
              case 'otp-read-stop':
                stopListeningMessageLoginPopup() 
                break;
              case 'shopify-logged-in' :
                handelShopifyLogin()
              default:
                  break;
          }
      }

      window.addEventListener('message', ShiprocketLoginMessageListener, false);
  }

window.shipRocketMarketingLogin=()=>{
triggerFastrLogin(true)
}

  
addEventListener("load", async(event) => {
    triggerFastrLogin(false)
});

  addEventListener('beforeunload', async(event) => {

      var isFastrrUp = 1
      // sellerDomain = document.getElementById('sellerDomain')?.value
      const uuid_cookie = getCookieLoginPopup('fastrr_uuid') ? getCookieLoginPopup('fastrr_uuid') : null;
      const usid_cookie = getCookieLoginPopup('fastrr_usid') ? getCookieLoginPopup('fastrr_usid') : null;
      const sellerConfigFL = getCookieLoginPopup('fastrr_seller_config') ? getCookieLoginPopup('fastrr_seller_config') : null;
      let uId = encodeURI(btoa(getSellerDomain()));
      var eventsEnabled = false

        // seller config
        if(!sellerConfigFL){
          const url = 'https://events.pickrr.com/config';
          const headers = {
            'uId': uId
          };
    
          await fetch(url, {
            method: 'GET', // or 'POST', 'PUT', 'DELETE', etc.
            headers: headers,
          })
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.json();
          })
          .then(data => {
            eventsEnabled = data?.data?.eventsEnabled
            setCookieLoginPopup('fastrr_seller_config',JSON.stringify(data),30)
          })
          .catch(error => {
          })
        }else{
          const sellerConfig = JSON.parse(sellerConfigFL)
          eventsEnabled = sellerConfig?.data?.eventsEnabled ?? false
        }


      // set cookies and send fastrr events if fastrr is up and running
      if(eventsEnabled){
        if(!uuid_cookie){
          const new_uuid = generateUUID()
          const new_usid = generateSessionID(new_uuid)
          sendFastrrEvents(new_uuid,new_usid,true,"USER_EVENT_PAGE_EXIT")
        }
        if(!!uuid_cookie && !usid_cookie){
          const new_usid = generateSessionID(uuid_cookie)
          sendFastrrEvents(uuid_cookie,new_usid,true,"USER_EVENT_PAGE_EXIT")
        }
    
        if(!!uuid_cookie && !!usid_cookie){
          sendFastrrEvents(uuid_cookie,usid_cookie,true,"USER_EVENT_PAGE_EXIT")
        }
      }
  });