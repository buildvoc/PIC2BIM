FROM nginx:stable-alpine

ARG USER_ID
ARG GROUP_ID

ENV USER_ID=${USER_ID}
ENV GROUP_ID=${GROUP_ID}

# MacOS staff group's gid is 20
RUN delgroup dialout

RUN addgroup -g ${GROUP_ID} --system laravel
RUN adduser -G laravel --system -D -s /bin/sh -u ${USER_ID} laravel
RUN sed -i "s/user  nginx/user laravel/g" /etc/nginx/nginx.conf

ADD ./nginx/default.conf /etc/nginx/conf.d/

RUN mkdir -p /var/www/html
