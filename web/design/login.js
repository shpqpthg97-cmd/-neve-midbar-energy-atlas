(() => {
  'use strict';
  const U=NMUI;
  const tools=document.createElement('div');tools.className='ds-login-toolbar';tools.innerHTML='<button type="button" data-ds-theme class="ds-ghost"></button>';document.body.prepend(tools);U.sync();
  const mark=document.querySelector('.mark');if(mark)mark.innerHTML=U.icon('zap');
  document.querySelector('main').id='mainContent';document.querySelector('main').tabIndex=-1;
  const skip=document.createElement('a');skip.href='#mainContent';skip.className='ds-skip';skip.textContent='דלג לתוכן הראשי';document.body.prepend(skip);
  U.addPasswords(document);
  const form=document.querySelector('.card form'),error=document.querySelector('.card .error');
  if(error){error.innerHTML=U.icon('triangle-alert')+'<span>'+error.innerHTML+'</span>';error.id='dsLoginError';if(form){form.querySelector('button[type=submit]').before(error);form.setAttribute('aria-describedby','dsLoginError')}}
  document.querySelectorAll('.card input').forEach(input=>{
    const hint=document.createElement('p');hint.id='dsError-'+input.id;hint.className='ds-field-error';hint.hidden=true;hint.setAttribute('aria-live','polite');(input.closest('.ds-password')||input).after(hint);
    input.addEventListener('invalid',()=>{const v=input.validity;const message=v.valueMissing?'יש למלא את השדה הזה.':v.typeMismatch?'יש להזין כתובת מייל תקינה.':v.patternMismatch?'יש להזין ערך בתבנית המבוקשת.':v.tooShort?'הערך קצר מדי. נדרשים לפחות '+input.minLength+' תווים.':'יש לבדוק את הערך שהוזן.';input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',hint.id);hint.innerHTML=U.icon('triangle-alert')+'<span>'+U.escape(message)+'</span>';hint.hidden=false});
    input.addEventListener('input',()=>{if(input.validity.valid){input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');hint.hidden=true}});
  });
  const footer=document.querySelector('.footer');const a=document.createElement('a');a.href='#dsAccessibilityStatement';a.textContent='הצהרת נגישות';a.onclick=e=>{e.preventDefault();U.show(U.statement,a)};footer.append(a);
})();
