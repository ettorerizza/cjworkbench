# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2018-08-15 17:32
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('server', '0116_remove_parameterspec_derived_data'),
    ]

    operations = [
        migrations.AddField(
            model_name='wfmodule',
            name='last_relevant_delta_id',
            field=models.IntegerField(default=0),
        ),
    ]
