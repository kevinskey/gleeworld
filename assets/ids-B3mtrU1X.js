const t=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;function a(){return crypto.randomUUID()}function f(n){return!!n&&t.test(n)}export{f as i,a as n};
