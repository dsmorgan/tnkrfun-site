FROM nginx:alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY site/ /usr/share/nginx/html
COPY district11/ /usr/share/nginx/district11
